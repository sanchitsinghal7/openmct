define([
    'text!../res/testDataTemplate.html',
    './TestDataItem',
    'zepto',
    'lodash'
], function (
    testDataTemplate,
    TestDataItem,
    $,
    _
) {

    function TestDataManager(domainObject, conditionManager, openmct) {
        var self = this;

        this.domainObject = domainObject;
        this.manager = conditionManager;
        this.openmct = openmct;

        this.evaluator = this.manager.getEvaluator();
        this.domElement = $(testDataTemplate);
        this.config = this.domainObject.configuration.testDataConfig;
        this.testCache = {};

        this.configArea = $('.widget-test-data-content', this.domElement);
        this.itemArea = $('.t-test-data-config', this.domElement);
        this.toggleConfigButton = $('.view-control', this.domElement);
        this.addItemButton = $('.add-item', this.domElement);
        this.testDataInput = $('.t-test-data-checkbox', this.domElement);

        this.onItemChange = this.onItemChange.bind(this);
        this.initItem = this.initItem.bind(this);
        this.removeItem = this.removeItem.bind(this);

        /**
         * Toggles the configuration area for test data in the view
         * @private
         */
        function toggleConfig() {
            self.configArea.toggleClass('expanded');
            self.toggleConfigButton.toggleClass('expanded');
        }

        /**
         * Toggles whether the associated {ConditionEvaluator} uses the actual
         * subscription cache or the test data cache
         * @param {Event} event The change event that triggered this callback
         * @private
         */
        function toggleTestData(event) {
            var elem = event.target;
            self.evaluator.useTestData(elem.checked);
            self.updateTestCache();
        }

        this.toggleConfigButton.on('click', toggleConfig);
        this.addItemButton.on('click', function () {
            self.initItem();
        });
        this.testDataInput.on('change', toggleTestData);

        this.evaluator.setTestDataCache(this.testCache);
        this.evaluator.useTestData(false);

        this.refreshItems();
    }

    /**
     * Get the DOM element representing this test data manager in the view
     */
    TestDataManager.prototype.getDOM = function () {
        return this.domElement;
    };

    /**
     * Initialze a new test data item, either from a source configuration, or with
     * the default empty configuration
     * @param {Object} sourceItem (optional) The source configuration to use when
     *                            instantiating this item. Must have object, key and
     *                            value fields.
     * @param {number} sourceIndex (optional) The index at which to insert the
     *                             new item
     */
    TestDataManager.prototype.initItem = function (sourceItem, sourceIndex) {
        var defaultItem = {
            object: '',
            key: '',
            value: ''
        },
        newItem;

        newItem = sourceItem || defaultItem;
        if (sourceIndex !== undefined) {
            this.config.splice(sourceIndex + 1, 0, newItem);
        } else {
            this.config.push(newItem);
        }
        this.updateDomainObject();
        this.refreshItems();
    };

    /**
     * Remove an item from this TestDataManager at the given index
     * @param {number} removeIndex The index of the item to remove
     */
    TestDataManager.prototype.removeItem = function (removeIndex) {
        _.remove(this.config, function (item, index) {
            return index === removeIndex;
        });
        this.updateDomainObject();
        this.refreshItems();
    };

    /**
     * Change event handler for the test data items which compose this
     * test data generateor
     * @param {string} value The new value from the test data items
     * @param {string} property The property of the test data item to modify
     * @param {number} index The index of the item which initiated the change event
     */
    TestDataManager.prototype.onItemChange = function (value, property, index) {
        this.config[index][property] = value;
        this.updateDomainObject();
        this.updateTestCache();
    };

    /**
     * Builds the test cache from the current item configuration, and passes
     * the new test cache to the associated {ConditionEvaluator} instance
     */
    TestDataManager.prototype.updateTestCache = function () {
        this.generateTestCache();
        this.evaluator.setTestDataCache(this.testCache);
        this.manager.triggerTelemetryCallback();
    };

    /**
     * Intantiate {TestDataItem} objects from the current configuration, and
     * update the view accordingly
     */
    TestDataManager.prototype.refreshItems = function () {
        var self = this;

        self.items = [];
        $('.t-test-data-item', this.domElement).remove();

        this.config.forEach(function (item, index) {
            var newItem = new TestDataItem(item, index, self.manager);
            newItem.on('remove', self.removeItem);
            newItem.on('duplicate', self.initItem);
            newItem.on('change', self.onItemChange);
            self.items.push(newItem);
        });

        self.items.forEach(function (item) {
            $('li:last-of-type', self.itemArea).before(item.getDOM());
        });

        if (self.items.length === 1) {
            self.items[0].hideButtons();
        }

        this.updateTestCache();
    };

    /**
     * Builds a test data cache in the format of a telemetry subscription cache
     * as expected by a {ConditionEvaluator}
     */
    TestDataManager.prototype.generateTestCache = function () {
        var testCache = this.testCache,
            manager = this.manager,
            compositionObjs = manager.getComposition(),
            metadata;

        testCache = {};
        Object.keys(compositionObjs).forEach(function (id) {
            testCache[id] = {};
            metadata = manager.getTelemetryMetadata(id);
            Object.keys(metadata).forEach(function (key) {
                testCache[id][key] = '';
            });
        });
        this.config.forEach(function (item) {
            if (testCache[item.object]) {
                testCache[item.object][item.key] = item.value;
            }
        });

        this.testCache = testCache;
    };

    /**
     * Update the domain object configuration associated with this test data manager
     */
    TestDataManager.prototype.updateDomainObject = function () {
        this.openmct.objects.mutate(this.domainObject, 'configuration.testDataConfig', this.config);
    };

    return TestDataManager;
});
