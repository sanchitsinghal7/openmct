/*****************************************************************************
 * Open MCT, Copyright (c) 2014-2017, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/

define(
    ['./AccessorMutator', './ResizeHandle'],
    function (AccessorMutator, ResizeHandle) {

        // Index deltas for changes in order
        var ORDERS = {
            top: Number.POSITIVE_INFINITY,
            up: 1,
            down: -1,
            bottom: Number.NEGATIVE_INFINITY
        };

        // Mininmum pixel height and width for objects
        var MIN_WIDTH = 10;
        var MIN_HEIGHT = 10;

        // Ensure a value is non-negative (for x/y setters)
        function clamp(value) {
            return Math.max(value, 0);
        }

        /**
         * Abstract superclass for other classes which provide useful
         * interfaces upon an elements in a fixed position view.
         * This handles the generic operations (e.g. remove) so that
         * subclasses only need to implement element-specific behaviors.
         *
         * Note that arguments here are meant to match those expected
         * by `Array.prototype.map`
         *
         * @memberof platform/features/layout
         * @constructor
         * @param element the fixed position element, as stored in its
         *        configuration
         * @param index the element's index within its array
         * @param {number[]} gridSize the current layout grid size in [x,y] from
         * @param {Array} elements the full array of elements
         */
        function ElementProxy(element, index, elements, gridSize) {
            /**
             * The element as stored in the view configuration.
             * @memberof platform/features/layout.ElementProxy#
             */
            this.element = element;

            /**
             * The current grid size of the layout.
             * @memberof platform/features/layout.ElementProxy#
             */
            this.gridSize = gridSize;

            this.resizeHandles = [new ResizeHandle(
                                    this.element,
                                    this.getMinWidth(),
                                    this.getMinHeight(),
                                    this.getGridSize()
                                  )];

            /**
             * Get and/or set the x position of this element.
             * Units are in fixed position grid space.
             * @param {number} [x] the new x position (if setting)
             * @returns {number} the x position
             * @memberof platform/features/layout.ElementProxy#
             */
            this.x = new AccessorMutator(element, 'x', clamp);

            /**
             * Get and/or set the y position of this element.
             * Units are in fixed position grid space.
             * @param {number} [y] the new y position (if setting)
             * @returns {number} the y position
             * @memberof platform/features/layout.ElementProxy#
             */
            this.y = new AccessorMutator(element, 'y', clamp);

            /**
             * Get and/or set the stroke color of this element.
             * @param {string} [stroke] the new stroke color (if setting)
             * @returns {string} the stroke color
             * @memberof platform/features/layout.ElementProxy#
             */
            this.stroke = new AccessorMutator(element, 'stroke');

            /**
             * Get and/or set the width of this element.
             * Units are in fixed position grid space.
             * @param {number} [w] the new width (if setting)
             * @returns {number} the width
             * @memberof platform/features/layout.ElementProxy#
             */
            this.width = new AccessorMutator(element, 'width');

            /**
             * Get and/or set the height of this element.
             * Units are in fixed position grid space.
             * @param {number} [h] the new height (if setting)
             * @returns {number} the height
             * @memberof platform/features/layout.ElementProxy#
             */
            this.height = new AccessorMutator(element, 'height');

            this.index = index;
            this.elements = elements;
            this.useGrid = element.useGrid;
        }

        /**
         * Change the display order of this element.
         * @param {string} o where to move this element;
         *        one of "top", "up", "down", or "bottom"
         */
        ElementProxy.prototype.order = function (o) {
            var index = this.index,
                elements = this.elements,
                element = this.element,
                delta = ORDERS[o] || 0,
                desired = Math.max(
                    Math.min(index + delta, elements.length - 1),
                    0
                );
            // Move to the desired index, if this is a change
            if ((desired !== index) && (elements[index] === element)) {
                // Splice out the current element
                elements.splice(index, 1);
                // Splice it back in at the correct index
                elements.splice(desired, 0, element);
                // Track change in index (proxy should be recreated
                // anyway, but be consistent)
                this.index = desired;
            }
        };

        /**
         * Remove this element from the fixed position view.
         */
        ElementProxy.prototype.remove = function () {
            var index = this.index;
            if (this.elements[index] === this.element) {
                this.elements.splice(index, 1);
            }
        };

        /**
         * Get handles to control specific features of this element,
         * e.g. corner size.
         * @return {platform/features/layout.ElementHandle[]} handles
         *         for moving/resizing this element
         */
        ElementProxy.prototype.handles = function () {
            return this.resizeHandles;
        };

        /**
         * Set whether this elements's position is determined in terms of grid
         * units or pixels.
         * @param {string} key Which unit to use, px or grid
         */
        ElementProxy.prototype.setUnits = function (key) {
            if (key === 'px' && this.element.useGrid === true) {
                this.element.useGrid = false;
                this.convertCoordsTo('px');
            } else if (key === 'grid' && this.element.useGrid === false) {
                this.element.useGrid = true;
                this.convertCoordsTo('grid');
            }
        };

        /**
         * Convert this element's coordinates and size from pixels to grid units,
         * or vice-versa.
         * @param {string} unit When called with 'px', converts grid units to
         *                      pixels; when called with 'grid', snaps element
         *                      to grid units
         */
        ElementProxy.prototype.convertCoordsTo = function (unit) {
            var gridSize = this.gridSize;
            var element = this.element;
            var minWidth = this.getMinWidth();
            var minHeight = this.getMinHeight();
            if (unit === 'px') {
                element.x = element.x * gridSize[0];
                element.y = element.y * gridSize[1];
                element.width = element.width * gridSize[0];
                element.height = element.height * gridSize[1];
                if (element.x2 && element.y2) {
                    element.x2 = element.x2 * gridSize[0];
                    element.y2 = element.y2 * gridSize[1];
                }
            } else if (unit === 'grid') {
                element.x = Math.round(element.x / gridSize[0]);
                element.y = Math.round(element.y / gridSize[1]);
                element.width = Math.max(Math.round(element.width / gridSize[0]), minWidth);
                element.height = Math.max(Math.round(element.height / gridSize[1]), minHeight);
                if (element.x2 && element.y2) {
                    element.x2 = Math.round(element.x2 / gridSize[0]);
                    element.y2 = Math.round(element.y2 / gridSize[1]);
                }
            }
        };

        /**
         * Returns which grid size the element is currently using.
         * @return {number[]} The current grid size in [x,y] form if the element
         *                    is currently using the grid, [1,1] if it is using
         *                    pixels.
         */
        ElementProxy.prototype.getGridSize = function () {
            var gridSize;
            if (this.element.useGrid) {
                gridSize = this.gridSize;
            } else {
                gridSize = [1,1];
            }
            return gridSize;
        };

        /**
         * Set the current grid size stored by this element proxy
         * @param {number[]} gridSize The current layout grid size in [x,y] form
         */
        ElementProxy.prototype.setGridSize = function (gridSize) {
            this.gridSize = gridSize;
        };

        /**
         * Get the current minimum element width in grid units
         * @return {number} The current minimum element width
         */
        ElementProxy.prototype.getMinWidth = function () {
            return Math.ceil(MIN_WIDTH / this.getGridSize()[0]);

        };

        /**
         * Get the current minimum element height in grid units
         * @return {number} The current minimum element height
         */
        ElementProxy.prototype.getMinHeight = function () {
            return Math.ceil(MIN_HEIGHT / this.getGridSize()[1]);
        };

        return ElementProxy;
    }
);
