function commonOnResize() {
    $(".tag-link").each(function (i) {
        const element = $(this);
        const tag = element.attr("tag");
        console.log({tag});
        if (tag == undefined)
        {
            return;
        }
        var changed = true;
        var list = element;
        while (!list.is("ul") && !list.is("ol"))
        {
            list = list.parent();
            if (list == undefined)
            {
                return;
            }
        }
        const available_width = list.width();
        const parent = element.parent();
        element.text("");
        const used_width = parent.width();
        const character_width = 8.8; // magic number (TODO: calculate this based on the element font)
        const width = available_width - used_width;
        const max_characters = Math.floor(width / character_width);
        const truncated_tag = (tag.length > 3 && tag.length > max_characters) ? tag.substring(0, max_characters - 3) + "..." : tag;
        changed = truncated_tag.length != element.text().length;
        const prev_width = element.width();
        element.text(truncated_tag);
        const new_width = element.width();
        console.log({truncated_tag, used_width, available_width, width, max_characters, prev_width, new_width});
    });
}
//window.onresize = commonOnResize;

async function commonPostLoad() {
    $("form.tag-search").submit(function (event) {
        event.preventDefault();
        const search_text = $("#search-bar").prop("value");
        if (search_text.match(/\//g))
        {
            return;
        }
        window.location.href = "/tag/" + search_text;
    });
    //commonOnResize();
};
window.onload = commonPostLoad;

async function buildAPIList(jqueryGetter, apiEndpoint, arrayGetter, HTMLFormatter) {
    const tag_list = $(jqueryGetter);
    if (tag_list.length > 0)
    {
        const response = await fetch(apiEndpoint);
        const json = await response.json();
        if (json.error.length > 0)
        {
            console.error("Failed to query /api/gallery/tags:", json.error);
            return;
        }
        for (const item of arrayGetter(json))
        {
            tag_list.append(HTMLFormatter(item));
        }
    }
}

async function buildTagList(apiEndpoint, tagHTMLFormatter) {
    await buildAPIList(".tag-list", apiEndpoint, json => json.tags, tagHTMLFormatter)
}
