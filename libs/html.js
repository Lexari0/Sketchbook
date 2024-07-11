function addGenerator(page, htmlTag, defaultAttributeMap = {}, hasContent = true) {
    if (hasContent)
    {
        page[htmlTag] = function (content = "", attributeMap = {}) {
            attributeMap = {...defaultAttributeMap, ...attributeMap};
            Object.keys(attributeMap).forEach(key => attributeMap[key] === undefined && delete attributeMap[key]);
            if (Object.keys(attributeMap).length == 0)
            {
                this.append(`<${htmlTag}>${content}</${htmlTag}>`);
            }
            else
            {
                let attributeList = [];
                for (const key in attributeMap)
                {
                    attributeList.push(`${key}="${attributeMap[key]}"`);
                }
                this.append(`<${htmlTag} ${attributeList.join(" ")}>${content}</${htmlTag}>`)
            }
            return this;
        }
    }
    else
    {
        page[htmlTag] = function (attributeMap) {
            attributeMap = {...defaultAttributeMap, ...attributeMap};
            Object.keys(attributeMap).forEach(key => attributeMap[key] === undefined && delete attributeMap[key]);
            if (Object.keys(attributeMap).length == 0)
            {
                this.append(`<${htmlTag} />`);
            }
            else
            {
                let attributeList = [];
                for (const key in attributeMap)
                {
                    attributeList.push(`${key}="${attributeMap[key]}"`);
                }
                this.append(`<${htmlTag} ${attributeList.join(" ")} />`)
            }
            return this;
        }
    }
}

module.exports = function (defaultContents = undefined) {
    let page = {
        content: (function () {
            if (typeof(defaultContents) == "string")
            {
                return [defaultContents];
            }
            if (defaultContents instanceof Array)
            {
                for (const i in defaultContents)
                {
                    defaultContents[i] = `${defaultContents}`;
                }
                return defaultContents;
            }
            return []
        })(),
        finalize: function () { return this.content.join(""); },
        toString: function () { return this.finalize(``); },
        append: function (element) {
            if (typeof(element) != "string")
            {
                element = `${element}`;
            }
            if (element.length > 0)
            {
                this.content.push(element);
            }
            return this;
        },
        appendTag: function (htmlTag, content = undefined, attributeMap = {}) {
            if (Object.keys(attributeMap).length == 0)
            {
                if (content == undefined)
                {
                    this.append(`<${htmlTag} />`);
                }
                else
                {
                    this.append(`<${htmlTag}>${content}</${htmlTag}>`);
                }
            }
            else
            {
                let attributeList = [];
                for (const key in attributeMap)
                {
                    attributeList.push(`${key}="${attributeMap[key]}"`);
                }
                if (content == undefined)
                {
                    this.append(`<${htmlTag} ${attributeList.join(" ")} />`)
                }
                else
                {
                    this.append(`<${htmlTag} ${attributeList.join(" ")}>${content}</${htmlTag}>`)
                }
            }
            return this;
        },
        DOCTYPE: function (doctype = "html") {
            this.append(`<!DOCTYPE ${doctype}>`);
            return this;
        }
    }
    addGenerator(page, "html");
    addGenerator(page, "head");
    addGenerator(page, "body");
    addGenerator(page, "header");
    addGenerator(page, "footer");

    addGenerator(page, "style");
    addGenerator(page, "script");
    addGenerator(page, "noscript");
    
    addGenerator(page, "a", {href: undefined});
    addGenerator(page, "p");
    addGenerator(page, "b");
    addGenerator(page, "i");
    addGenerator(page, "u");
    addGenerator(page, "s");
    addGenerator(page, "sub");
    addGenerator(page, "sup");
    addGenerator(page, "pre");
    addGenerator(page, "code");
    
    addGenerator(page, "h1");
    addGenerator(page, "h2");
    addGenerator(page, "h3");
    addGenerator(page, "h4");
    addGenerator(page, "h5");
    addGenerator(page, "h6");
    
    addGenerator(page, "ol");
    addGenerator(page, "ul");
    addGenerator(page, "li");
    
    addGenerator(page, "table");
    addGenerator(page, "tr");
    addGenerator(page, "th");
    addGenerator(page, "td");
    
    addGenerator(page, "div");
    addGenerator(page, "span");
    
    addGenerator(page, "img", { src: undefined }, false);
    addGenerator(page, "br", {}, false);
    addGenerator(page, "hr", {}, false);
    addGenerator(page, "link", { rel: "stylesheet", type: "text/css", href: undefined }, false);
    
    addGenerator(page, "form", { action: undefined, method: "post" });
    addGenerator(page, "input", { type: "text", name: undefined });
    addGenerator(page, "textarea", { rows: 5, cols: 40, name: undefined });
    addGenerator(page, "button", { type: "button", value: undefined });
    
    addGenerator(page, "colgroup", { span: undefined });
    addGenerator(page, "col", { width: 100});
    return page;
};
