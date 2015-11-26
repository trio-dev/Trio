if( typeof exports !== 'undefined' ) {
    
    if( typeof module !== 'undefined' && module.exports ) {
        exports = module.exports = Trio;
    }

    exports.Trio = Trio;

} else {

    if (typeof window !== 'undefined') {
        window.Trio = Trio;
    } else if (typeof global !== 'undefined') {
        global.Trio = Trio;
    }
}
