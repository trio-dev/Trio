module.exports = function(str) {
    var count = 1;

    return function() {
        var id = str + count;
        count++;
        return id;
    }
};

