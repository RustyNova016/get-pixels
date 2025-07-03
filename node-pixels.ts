import ndarray from "ndarray";
import jpeg from "jpeg-js";
import parseDataURI from "parse-data-uri";
import { PNG } from "pngjs";

function handlePNG(data: string | Buffer) {
    const png = new PNG();
    const img_data = png.parse(data);

    return ndarray(
        new Uint8Array(img_data.data),
        [img_data.width | 0, img_data.height | 0, 4],
        [4, (4 * img_data.width) | 0, 1],
        0
    );
}

function handleJPEG(data: jpeg.BufferLike) {
    const jpegData = jpeg.decode(data);

    if (!jpegData) {
        throw new Error("Error decoding jpeg");
    }

    var nshape = [jpegData.height, jpegData.width, 4];
    return ndarray(jpegData.data, nshape);
}

function doParse(mimeType: string, data) {
    switch (mimeType) {
        case "image/png":
            return handlePNG(data);

        case "image/jpg":
        case "image/jpeg":
            return handleJPEG(data);

        // case "image/gif":
        //     handleGIF(new Uint8Array(data), cb);
        //     break;

        // case "image/bmp":
        //     handleBMP(data, cb);
        //     break;

        default:
            throw new Error("Unsupported file type: " + mimeType);
    }
}

export async function getPixels(url: string | Buffer, type: string) {
    // Are we a buffer?
    if (Buffer.isBuffer(url)) {
        // Do we have the type?
        if (!type) {
            throw new Error("Invalid file type");
        }

        doParse(type, url);
    } else if (url.indexOf("data:") === 0) {
        try {
            const buffer = parseDataURI(url);
            if (buffer) {
                process.nextTick(function () {
                    doParse(type || buffer.mimeType, buffer.data);
                });
            } else {
                process.nextTick(function () {
                    throw new Error("Error parsing data URI");
                });
            }
        } catch (err) {
            process.nextTick(function () {
                throw err;
            });
        }
    } else if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) {
        let contentType;
        fetch(url)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("HTTP request failed");
                }

                contentType = response.headers.get("content-type");
                if (!contentType) {
                    throw new Error("Invalid content-type");
                }

                return response.arrayBuffer();
            })
            .then((body) => {
                doParse(contentType, body, cb);
            })
            .catch((err) => {
                cb(err);
            });
    } else {
        fs.readFile(url, function (err, data) {
            if (err) {
                cb(err);
                return;
            }
            type = type || mime.lookup(url);
            if (!type) {
                cb(new Error("Invalid file type"));
                return;
            }
            doParse(type, data, cb);
        });
    }
}
