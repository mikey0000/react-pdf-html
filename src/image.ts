import { SourceBuffer } from '@react-pdf/types';
import ReactPDF from '@react-pdf/renderer';

export class ImageProcessor {
  private readonly imageSrc: string;

  public constructor(src: string) {
    this.imageSrc = src;
  }

  public async getImageBuffer(): Promise<Buffer> {
    return await this.createBuffer();
  }

  private renderToCanvas(image: HTMLImageElement): string {
    let canvas = document.createElement('canvas');

    canvas.width = image.width;

    canvas.height = image.height;
    let context = canvas.getContext('2d');
    // draw image in canvas starting left-0 , top - 0
    if (context) {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    }

    //default conversion to jpg
    return canvas.toDataURL();
  }

  private async getBufferFromBlob(blob: Blob): Promise<Buffer> {
    let img;
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function () {
        try {
          img = new Uint8Array(this.result as ArrayBuffer);
          // URL.revokeObjectURL(blob);
          resolve(img as Buffer);
        } catch (ex) {
          reject(ex);
          // if there's an error parsing the JPEG stream, it could be due to a
          // misconfigured server (improper content-type:
          // https://github.com/telerik/kendo-ui-core/issues/4184).  If that's the case,
          // the canvas will still be able to draw it.
          //_trycanvas();
        }
      };
      reader.readAsArrayBuffer(blob);
    });
  }

  private async base64ToBuffer(dataUrl: string): Promise<Buffer> {
    let blob, bloburl;

    return await new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.onload = () => {
        blob = xhr.response;
        //var blob = new Blob([this.response], {type: 'image/png'});
        //bloburl = URL.createObjectURL(blob);
        resolve(this.getBufferFromBlob(blob));
      };
      xhr.onerror = reject;
      xhr.open('GET', dataUrl, true);
      xhr.responseType = 'blob'; //arraybuffer
      xhr.send();
    });
  }

  private async createBuffer(): Promise<Buffer> {
    if (/^data:image\/svg\+xml;./.test(this.imageSrc)) {
      const img = new Image();
      //create SVG image as jpg data
      return new Promise((resolve, reject) => {
        img.onload = () => {
          var dataUrl = this.renderToCanvas(img);

          return resolve(this.base64ToBuffer(dataUrl));
        };

        img.src = this.imageSrc;
      });
    }

    if (!this.imageSrc) {
      console.warn('no image source found');
      const blankImage = new Image(1, 1);
    }

    return await this.base64ToBuffer(this.imageSrc);
  }
}
