const path = require('path');
const StackblitzBuilder = require('./builder');
/**预制的例子 */
const EXAMPLES_PATH = path.join(__dirname, '../../content/examples');
/**生成后的文件夹例子 */
const LIVE_EXAMPLES_PATH = path.join(__dirname, '../../src/generated/live-examples');
new StackblitzBuilder(EXAMPLES_PATH, LIVE_EXAMPLES_PATH).build();

