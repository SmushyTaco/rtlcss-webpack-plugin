import webpack from 'webpack';
import postcss from 'postcss';
import rtlcss, { ConfigOptions } from 'rtlcss';

type RtlCssPluginOptions = {
    fileNameMap?: Record<string, string>;
    sourceMap?: boolean | 'inline' | 'hidden';
    rtlcssConfig?: ConfigOptions;
};

class RtlCssPlugin {
    private readonly fileNameMap: Record<string, string>;
    private readonly sortedFileNameMapKeys: string[];
    private readonly sourceMap: boolean | 'inline' | 'hidden';
    private readonly rtlcssConfig?: ConfigOptions;
    constructor(options: RtlCssPluginOptions = {}) {
        this.fileNameMap = options.fileNameMap || {
            '.css': '[name].rtl.css',
            '.min.css': '[name].rtl.min.css'
        };
        this.sortedFileNameMapKeys = Object.keys(this.fileNameMap).sort(
            (a, b) => {
                const dotCountA = (a.match(/\./g) || []).length;
                const dotCountB = (b.match(/\./g) || []).length;

                if (dotCountA !== dotCountB) {
                    return dotCountB - dotCountA;
                }
                return b.length - a.length;
            }
        );
        this.sourceMap = options.sourceMap ?? false;
        this.rtlcssConfig = options.rtlcssConfig;
    }

    private getOutputFileName(
        inputFileName: string,
        extension: string
    ): string {
        const baseName = inputFileName.slice(0, -extension.length);
        const template =
            this.fileNameMap[extension] || `${baseName}.rtl${extension}`;
        return template.replace('[name]', baseName);
    }

    private async processAssets(
        compilation: webpack.Compilation
    ): Promise<void> {
        const chunks = [...compilation.chunks];
        for (const chunk of chunks) {
            const files = [...chunk.files];
            for (const fileName of files) {
                const extension = this.sortedFileNameMapKeys.find((key) =>
                    fileName.endsWith(key)
                );
                if (!extension) continue;

                const asset = compilation.assets[fileName];
                const cssContent = asset.source().toString();
                const rtlFileName = this.getOutputFileName(fileName, extension);

                const result = await postcss([
                    rtlcss(this.rtlcssConfig)
                ]).process(cssContent, {
                    from: fileName,
                    to: rtlFileName,
                    map: {
                        inline: this.sourceMap === 'inline',
                        annotation: this.sourceMap !== 'hidden'
                    }
                });

                compilation.assets[rtlFileName] = new webpack.sources.RawSource(
                    result.css
                );
                chunk.files.add(rtlFileName);

                if (
                    result.map &&
                    (this.sourceMap === true || this.sourceMap === 'hidden')
                ) {
                    const mapFileName = `${rtlFileName}.map`;
                    compilation.assets[mapFileName] =
                        new webpack.sources.RawSource(result.map.toString());
                    chunk.files.add(mapFileName);
                }
            }
        }
    }

    // noinspection JSUnusedGlobalSymbols
    public apply(compiler: webpack.Compiler): void {
        compiler.hooks.compilation.tap('RtlCssPlugin', (compilation) => {
            compilation.hooks.processAssets.tapPromise(
                {
                    name: 'RtlCssPlugin',
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_DERIVED
                },
                async () => {
                    await this.processAssets(compilation);
                }
            );
        });
    }
}

// noinspection JSUnusedGlobalSymbols
export default RtlCssPlugin;
