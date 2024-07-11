async function buildAPIList(jqueryGetter, api_endpoint, array_getter, html_formatter) {
    const tag_list = $(jqueryGetter);
    if (tag_list.length > 0)
    {
        const response = await fetch(api_endpoint);
        const json = await response.json();
        if (json.error.length > 0)
        {
            console.error("Failed to query ", api_endpoint, ":", json.error);
            return;
        }
        for (const item of array_getter(json))
        {
            tag_list.append(html_formatter(item));
        }
    }
}

async function buildTagList(api_endpoint, tag_html_formatter = tag => `<li><a class="tag-link" href="/tag/${tag.tag}" tag="${tag.tag}" ${tag.color ? `style="color: ${tag.color}"` : ""}>${tag.tag}</a>: ${tag.count}</li>`) {
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
    const auto_complete_delay_ms = 200;
    const tag_search_bar = $("form.tag-search #search-bar, #front-query #search-bar, .item-search #search-bar");
    if (tag_search_bar.length === 0)
    {
        return;
    }
    const autocomplete = tag_search_bar.parent().find("div.autocomplete");
    updateAutocompleteCSS(autocomplete, tag_search_bar);
    $(window).resize(() => updateAutocompleteCSS(autocomplete, tag_search_bar));
    var selection_start;
    async function createAutoComplete() {
        const search_string = tag_search_bar.val();
        console.log("Attempting autocomplete:", search_string);
        if (search_string.length < 1)
        {
            console.log("Length too short");
            return;
        }
        const clamped_selected_index = Math.max(Math.min(selection_start - 1, search_string.length - 1), 0);
        const selected_character = search_string.substring(clamped_selected_index, clamped_selected_index + 1);
        console.log({search_string, selection_start, clamped_selected_index, selected_character});
        if (selected_character.match(/\s/))
        {
            console.log("Last character is whitespace");
            return;
        }
        const search_front = search_string.substring(0, selection_start);
        const front_last_tag_match = search_front.match(/[^-~\s]+$/);
        const search_front_to_tag = search_string.substring(0, selection_start - (front_last_tag_match ? front_last_tag_match[0].length : 0));
        const search_back = search_string.substring(selection_start - 1);
        const back_first_tag_match = search_back ? search_back.match(/^[^-~\s]+/) : undefined;
        const search_back_from_tag = search_string.substring(selection_start + (back_first_tag_match ? back_first_tag_match[0].length : 0));
        const typed_tag_match = search_string.substring(search_front_to_tag.length, search_string.length - search_back_from_tag.length);
        if (!typed_tag_match || typed_tag_match.length <= 2)
        {
            console.log("Partial tag too short");
            return;
        }
        const api_url = `/api/gallery/tags?like=${typed_tag_match}`;
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
                console.log({search_front_to_tag, tag:tag.tag, search_back_from_tag, back_first_tag_match});
                const new_search = (search_front_to_tag ? search_front_to_tag : "") + tag.tag + " " + search_back_from_tag;
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
        else if (event.originalEvent.key.match(/ArrowUp|ArrowDown|Enter|Escape/))
        {
            if (autocomplete.css("display") != "none" || autocomplete.children().length == 0)
            {
                const current_selected = autocomplete.find(".autocomplete-entry-selected");
                if (event.originalEvent.key.startsWith("Arrow"))
                {
                    event.preventDefault();
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
                else if (event.originalEvent.key === "Enter")
                {
                    if (current_selected.length)
                    {
                        event.preventDefault();
                        current_selected.click();
                    }
                }
                else if (event.originalEvent.key === "Escape")
                {
                    autocomplete.css("display", "none");
                    autocomplete.html();
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

function formatAsTag(tag) {
    return tag.replace(/^\s+|\s+$/, "").replace(/\s+/g, "_").toLowerCase()
}

function getInvalidCharactersInTag(tag) {
    return [...new Set(tag.match(/[:{}<>="'`]/g))]
}

function getErrorMessageForInvalidCharacters(bad_matches) {
    if (bad_matches.length === 0)
    {
        return "No invalid characters in tag/category.";
    }
    const last = bad_matches.pop();
    if (bad_matches.length === 0)
    {
        return `${last} is an illegal or reserved character in tags/categories!`;
    }
    return `${bad_matches.map(x => `'${x}'`).join()}${bad_matches.length > 1 ? "," : ""} and '${last}' are illegal or reserved characters in tags/categories!`;
}
