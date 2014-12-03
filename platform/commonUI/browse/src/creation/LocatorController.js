/*global define*/

define(
    [],
    function () {
        "use strict";

        /**
         * Controller for the "locator" control, which provides the
         * user with the ability to select a domain object as the
         * destination for a newly-created object in the Create menu.
         * @constructor
         */
        function LocatorController($scope) {
            // Populate values needed by the locator control. These are:
            // * rootObject: The top-level object, since we want to show
            //               the full tree
            // * treeModel: The model for the embedded tree representation,
            //              used for bi-directional object selection.
            function setLocatingObject(domainObject) {
                var context = domainObject &&
                    domainObject.getCapability("context");

                $scope.rootObject = context && context.getRoot();
                $scope.treeModel.selectedObject = domainObject;
                $scope.ngModel[$scope.field] = domainObject;
            }

            // Initial state for the tree's model
            $scope.treeModel =
                { selectedObject: $scope.ngModel[$scope.field] };

            // Watch for changes from the tree
            $scope.$watch("treeModel.selectedObject", setLocatingObject);
        }

        return LocatorController;
    }
);
