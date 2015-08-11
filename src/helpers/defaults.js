function defaults(obj, def) {
    def = def || {};
    
    for (var key in def) {
        if (!obj[key]) {
            obj[key] = def[key];
        }
    }

    return obj;
}