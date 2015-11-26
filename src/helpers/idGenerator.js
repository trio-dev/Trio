(function() {
    // Function to generate uuid for Trio instance
    
    scope.idGenerator = idGenerator;
    
    function idGenerator(str) {
        var count = 1;

        return function() {
            var id = str + count;
            count++;
            return id;
        };
    }
})();
