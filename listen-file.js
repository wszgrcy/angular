console.log('当前文件夹', __dirname)
const chokidar = require('chokidar')
const process = require('child_process')
/**监听的文件 */
const listen_dir = `/data/angular/packages`
/**shell文件路径 */
const shell = '/data/angular/build-angular.sh'
let isCompile = false
chokidar.watch(listen_dir, {
    // usePolling: true
}).on('all', (e, path, stat) => {
    console.log('需要编译');
    isCompile = true
    if (!isCompile) {
        process.execFile(shell, (error, stdout) => {
            console.log('运行结束')
            if (error) console.error(error)

            isCompile = false
        })
    }
})