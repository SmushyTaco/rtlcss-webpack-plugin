import path from 'path';
import rtlcss from 'rtlcss';
import webpack, { Compilation, Compiler } from 'webpack';
const cssOnly = (filename: string): boolean =>
    path.extname(filename) === '.css';
class RtlCssPlugin {
    private readonly fileName: string;

    constructor(fileName: string = '[name].rtl.css') {
        this.fileName = fileName;
    }

    private readonly processAssets = (
        compilation: Compilation,
        callback: () => void
    ): void => {
        const chunks = Array.from(compilation.chunks);

        chunks.forEach((chunk) => {
            const files = Array.from(chunk.files);
            files.filter(cssOnly).forEach((filename) => {
                const src = compilation.assets[filename].source().toString();
                const dst = rtlcss.process(src);
                const dstFileName = compilation.getPath(this.fileName, {
                    chunk,
                    filename
                });

                compilation.assets[dstFileName] = new webpack.sources.RawSource(
                    dst
                );
                chunk.files.add(dstFileName);
            });
        });

        callback();
    };
    // noinspection JSUnusedGlobalSymbols
    public apply(compiler: Compiler): void {
        compiler.hooks.compilation.tap(
            'RtlCssPlugin',
            (compilation: Compilation) => {
                compilation.hooks.processAssets.tapAsync(
                    {
                        name: 'RtlCssPlugin',
                        stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE
                    },
                    (_chunks, callback) =>
                        this.processAssets(compilation, callback)
                );
            }
        );
    }
}
// noinspection JSUnusedGlobalSymbols
export default RtlCssPlugin;
