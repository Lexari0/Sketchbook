async function buildAPIList(jqueryGetter, api_endpoint, array_getter, html_formatter) {
    const tag_list = $(jqueryGetter);
    if (tag_list.length > 0)
    {
        const response = await fetch(api_endpoint);
        const json = await response.json();
        if (json.error.length > 0)
        {
            console.error("Failed to query /api/gallery/tags:", json.error);
            return;
        }
        for (const item of array_getter(json))
        {
            tag_list.append(html_formatter(item));
        }
    }
}

async function buildTagList(api_endpoint, tag_html_formatter) {
    await buildAPIList(".tag-list", api_endpoint, json => json.tags, tag_html_formatter)
}

function updateAutocompleteCSS(autocomplete_element, search_bar_element) {
    autocomplete_element.css("position", "absolute");
    autocomplete_element.css("top", search_bar_element.offset().top + search_bar_element.outerHeight());
    autocomplete_element.css("left", search_bar_element.position().left);
    autocomplete_element.css("width", search_bar_element.outerWidth());
}

function setupTagAutocomplete() {
    var typing_timer;
    const auto_complete_delay_ms = 500;
    const tag_search_bar = $("form.tag-search #search-bar, #front-query #search-bar");
    const autocomplete = tag_search_bar.parent().find("div.autocomplete");
    updateAutocompleteCSS(autocomplete, tag_search_bar);
    $(window).resize(() => updateAutocompleteCSS(autocomplete, tag_search_bar));
    var selection_start;
    async function createAutoComplete() {
        const search_string = tag_search_bar.val();
        if (search_string.length < 1)
        {
            return;
        }
        if (search_string[Math.min(selection_start, search_string.length - 1)].match(/\s/))
        {
            return;
        }
        const search_front = search_string.substring(0, selection_start);
        const front_last_tag_match = search_front.match(/[^-~\s]+$/).shift();
        const search_front_to_tag = search_string.substring(0, selection_start - (front_last_tag_match ? front_last_tag_match.length : 0));
        const search_back = search_string.substring(selection_start);
        const back_first_tag_match = search_back ? search_back.match(/^[^-~\s]+/).shift() : "";
        const search_back_from_tag = search_string.substring(selection_start + (back_first_tag_match ? back_first_tag_match.length : 0));
        const last_tag_match = search_string.substring(search_front_to_tag.length, search_string.length - search_back_from_tag.length);
        if (!last_tag_match || last_tag_match.length <= 2)
        {
            return;
        }
        const api_url = `/api/gallery/tags?like=${last_tag_match}`;
        const response = await fetch(api_url);
        const json = await response.json();
        autocomplete.css("display", "block");
        autocomplete.html("");
        console.log("Updating autocomplete:", json);
        for (const tag of json.tags)
        {
            console.log("Adding autocomplete:", tag.tag);
            const new_autocomplete_option = $(`<div class="autocomplete-entry"><a class="autocomplete-tag">${tag.tag}</a><a class="autocomplete-tag-count">${tag.count}</a></div>`)
            new_autocomplete_option.click(() => {
                const current_search = tag_search_bar.val().replace(/\s+$/, "");
                const last_tag_match = current_search.match(/[^-~\s]+$/).shift();
                console.log({current_search, last_tag_match, tag: tag.tag});
                const new_search = current_search.substring(0, current_search.length - (last_tag_match ? last_tag_match.length : 0)) + tag.tag;
                tag_search_bar.val(new_search);
                autocomplete.css("display", "none");
                autocomplete.html("");
            });
            autocomplete.append(new_autocomplete_option);
        }
    }
    tag_search_bar.on("keyup", function (event) {
        selection_start = event.target.selectionStart;
        if (event.originalEvent.key.match(/^.$|Backspace|Delete/))
        {
            clearTimeout(typing_timer);
            typing_timer = setTimeout(createAutoComplete, auto_complete_delay_ms);
        }
    });
    tag_search_bar.on("keydown", function (event) {
        if (event.originalEvent.key.match(/^.$|Backspace|Delete/))
        {
            autocomplete.css("display", "none");
            autocomplete.html();
        }
        else if (["ArrowUp", "ArrowDown", "Enter"].includes(event.originalEvent.key))
        {
            if (autocomplete.css("display") != "none" || autocomplete.children().length == 0)
            {
                const current_selected = autocomplete.find(".autocomplete-entry-selected");
                if (event.originalEvent.key.startsWith("Arrow"))
                {
                    var next_option;
                    if (event.originalEvent.key === "ArrowUp")
                    {
                        if (current_selected.length)
                        {
                            next_option = current_selected.prev();
                        }
                        else
                        {
                            next_option = autocomplete.children(".autocomplete-entry").last();
                        }
                    }
                    else
                    {
                        if (current_selected.length)
                        {
                            next_option = current_selected.next();
                        }
                        else
                        {
                            next_option = autocomplete.children(".autocomplete-entry").first();
                        }
                    }
                    console.log({current_selected, next_option});
                    if (next_option.length)
                    {
                        current_selected.prop("class", "autocomplete-entry");
                    }
                    next_option.prop("class", "autocomplete-entry-selected");
                }
                else
                {
                    if (current_selected.length)
                    {
                        event.preventDefault();
                        current_selected.click();
                    }
                }
            }
        }
        clearTimeout(typing_timer);
    });
}

$(async () => {
    $("form.tag-search").submit(function (event) {
        event.preventDefault();
        const search_text = $(this).find("#search-bar").prop("value").replace(/^\s+|\s+$/g, "").replace(/\s+/g, "_");
        console.log(search_text);
        if (search_text.length == 0 || search_text.match(/\//g))
        {
            return;
        }
        window.location.href = "/tag/" + search_text;
    });
    $("form.category-search").submit(function (event) {
        event.preventDefault();
        const search_text = $(this).find("#search-bar").prop("value").replace(/^\s+|\s+$/g, "").replace(/\s+/g, "_");
        console.log(search_text);
        if (search_text.length == 0 || search_text.match(/\//g))
        {
            return;
        }
        window.location.href = "/tags/category/" + search_text;
    });
    setupTagAutocomplete();
});
