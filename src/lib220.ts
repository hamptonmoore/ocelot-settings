function lib220(config) {
  function hexColorChannel(n: number): string {
    let v = (Math.floor(n * 255)).toString(16);
    if (v.length < 2) { v = '0' + v; }
    return v;
  }

  function rgbToHex(rgb: number[]): string {
    let hex = '#';
    for (let i = 0; i < 3; ++i) {
      hex += hexColorChannel(rgb[i]);
    }
    return hex;
  }

  function argCheck(func: string, p: any, paramTypes: string[]): void {
    try {
      const n = paramTypes.length;
      if (p.length !== n) {
        throw new TypeError(`Invalid call to ${func}: ${n} arguments required but ${p.length} given`);
      }
      for (let i = 0; i < n; ++i) {
        const t = typeof(p[i]);
        if (t !== paramTypes[i]) {
          throw new TypeError(`Invalid call to ${func}: argument ${i} expected ${paramTypes[i]} but ${t} given`);
        }
      }
    } catch (e) {
      if (e.toString().includes(`Invalid call to ${func}:`)) {
        // This is one of our expected errors.
        throw(e);
      } else {
        // Unknown error.
        throw new Error(`Invalid call to ${func}: ${e}`);
      }
    }
  }

  function validateColor(col: any): void {
    try {
      if (
        col.length !== 3 ||
        typeof(col[0]) !== 'number' ||
        typeof(col[1]) !== 'number' ||
        typeof(col[2]) !== 'number') {
        throw new TypeError(`Invalid color value`);
      }
    } catch (e) {
      throw new TypeError(`Invalid color value`);
    }
  }

  class DrawingCanvas {
    public width: number = 1;
    public height: number = 1;
    public ctx: CanvasRenderingContext2D | undefined = undefined;

    constructor(w: number, h: number) {
      argCheck('DrawingCanvas constructor', arguments, ['number', 'number']);
      this.width = w;
      this.height = h;
      if (typeof document === 'undefined') {
        return;  // for node
      }
      const canvases = document.getElementById('canvases')!,
            canvas = document.createElement('canvas');
      canvas.setAttribute('width', this.width.toString());
      canvas.setAttribute('height', this.height.toString());
      this.ctx = canvas.getContext('2d')!;
      canvas.style.paddingBottom = '5px';
      canvas.style.display = 'block';
      canvases.appendChild(canvas);
      this.ctx.fillStyle = 'white';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    public drawLine(x1: number, y1: number, x2: number, y2: number, col: number[]) {
      argCheck('drawLine', arguments, ['number', 'number', 'number', 'number', 'object']);
      validateColor(col);
      if (this.ctx === undefined) {
        return;  // for node
      }
      this.ctx.strokeStyle = rgbToHex(col);
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }

    public drawArc(x: number, y: number, r: number, a0: number, a1: number, col: number[]) {
      argCheck('drawArc', arguments, ['number', 'number', 'number', 'number', 'number', 'object']);
      validateColor(col);
      if (this.ctx === undefined) {
        return;  // for node
      }
      this.ctx.strokeStyle = rgbToHex(col);
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, a0, a1);
      this.ctx.stroke();
    }

    public drawCircle(x: number, y: number, r: number, col: number[]) {
      argCheck('drawCircle', arguments, ['number', 'number', 'number', 'object']);
      validateColor(col);
      this.drawArc(x, y, r, 0, 2 * Math.PI, col);
    }

    public drawFilledCircle(x: number, y: number, r: number, col: number[]) {
      argCheck('drawCircle', arguments, ['number', 'number', 'number', 'object']);
      validateColor(col);
      if (this.ctx === undefined) {
        return;  // for node
      }
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, 2 * Math.PI);
      this.ctx.fillStyle = rgbToHex(col);
      this.ctx.fill();
    }

    public clear() {
      argCheck('clear', arguments, []);
      if (this.ctx === undefined) {
        return;  // for node
      }
      this.ctx.fillStyle = 'white';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  class FudgedImageData implements ImageData {
    public width: number = 1;
    public height: number = 1;
    public data: Uint8ClampedArray = new Uint8ClampedArray(4);

    constructor(width: number, height: number) {
      if (arguments.length !== 2) {
        throw new TypeError(`Failed to construct Node 'ImageData': 2 arguments required but ${arguments.length} given`);
      }
      if ((typeof width !== 'number' || width === 0)) {
        throw new Error('Failed to construct \'ImageData\': width is zero or not a number.');
      }
      if ((typeof height !== 'number' || height === 0)) {
        throw new Error('Failed to construct \'ImageData\': width is zero or not a number.');
      }
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(4 * this.width * this.height);
    }
  }

  function createImageData(w: number, h: number): ImageData {
    return (typeof ImageData !== 'undefined') ?
      new ImageData(w, h) : new FudgedImageData(w, h);
  }

  function assertValidPixel(pixel: any) {
    if (pixel.length !== 3) {
      throw new Error(`A pixel value must be a 3-element array`);
    }
    for (let i = 0; i < 3; i++) {
      if (typeof pixel[i] !== 'number') {
        throw new Error(`Pixel channel value must be a number`);
      }
      if (pixel[i] < 0.0 || pixel[i] > 1.0) {
        throw new Error(`Pixel channel value ${pixel[i]} is invalid`);
      }
    }
  }

  function EncapsulatedImage(imageData: any) {
    const data = imageData.data,
          w = imageData.width,
          h = imageData.height;
    function assertValidCoordinate(x: any, y: any) {
      if (x < 0 || y < 0 || x >= w || y >= h) {
        throw new Error(`Pixel coordinate (${x}, ${y}) is invalid. The image has height ${h} and width ${w}.`);
      }
    }

    return Object.freeze({
      width: w,
      height: h,
      copy: function() {
        const copiedImage = EncapsulatedImage(createImageData(w, h));
        let pixel;
        for (let i = 0; i < w; i++) {
          for (let j = 0; j < h; j++) {
            pixel = this.getPixel(i, j);
            copiedImage.setPixel(i, j, pixel);
          }
        }
        return copiedImage;
      },
      show: function() {
        if (typeof document === 'undefined') {
          return; //  for node
        }
        const canvases = document.getElementById('canvases')!,
              canvas = document.createElement('canvas');
        canvas.setAttribute('width', w);
        canvas.setAttribute('height', h);
        const ctx = canvas.getContext('2d')!;
        ctx.putImageData(imageData, 0, 0);
        canvas.style.display = 'block';
        canvas.style.paddingBottom = '5px';
        canvases.appendChild(canvas);
      },
      setPixel: function(x: any, y: any, c: any) {
        if (arguments.length !== 3) {
          throw new Error(`.setPixel expects 3 arguments, received ${arguments.length}`);
        }
        assertValidCoordinate(x, y);
        assertValidPixel(c);
        const index = 4 * (y * w + x);
        data[index] = Math.round(c[0] * 255);
        data[index + 1] = Math.round(c[1] * 255);
        data[index + 2] = Math.round(c[2] * 255);
        data[index + 3] = 255;
      },
      getPixel: function(x: any, y: any) {
        if (arguments.length !== 2) {
          throw new Error(`.getPixel expects 2 arguments, received ${arguments.length}`);
        }
        assertValidCoordinate(x, y);
        const index = 4 * (y * w + x),
              p = config.stopifyArray([
                data[index] / 255.0,
                data[index + 1] / 255.0,
                data[index + 2] / 255.0
              ]);
        return p;
      }
    });
  }

  /*
   * A handler for loading files
   *
   * @param {*} defaultOutput - The default object to return when function is not called on browser.
   * @param {(runner: any, response: any, ...args: any[]) => void} loadFunction -
   *          The function that loads the correct file format (must have runner.continueImmediate).
   */
  function loadURLHandler(defaultOutput: any, loadFunction: (runner: any, response: any) => any) {
    return function(url: any) {
      if (typeof document === 'undefined') {
        return defaultOutput;
      }
      const runnerResult = config.getRunner();
      if (runnerResult.kind === 'error') {
        throw new Error('Program is not running');
      }
      const runner = runnerResult.value.runner!;
      return runner.pauseImmediate(() => {
        const userEmail = localStorage.getItem('userEmail'),
              sessionId = localStorage.getItem('sessionId');
        if (userEmail === null) {
          userEmail = "anonymousUser"
        }
         if (sessionId === null) {
          sessionId = "anonymousUser"
        }
        const encodedURL = encodeURIComponent(url);
        const baseUrl = config.baseUrl;
        const getUrlLink = `${baseUrl}geturl?`;
        const queryURL = `${getUrlLink}url=${encodedURL}&user=${userEmail}&session=${sessionId}`;
        fetch(queryURL).then(response => {
          if (!response.ok) {
            if (runnerResult.value.isRunning) {
              runner.continueImmediate({
                type: 'exception',
                stack: [],
                value: new Error(`Could not load from URL, URL may be invalid or redirected`),
              });
            } else {
              runnerResult.value.onStopped();
            }
          }
          return response;
        }).then(response => {
          loadFunction(runnerResult.value, response);
        }).catch(err => {
          if (runnerResult.value.isRunning) {
            runner.continueImmediate({
              type: 'exception',
              stack: [],
              value: new Error(`Could not load from URL`),
            });
          } else {
            runnerResult.value.onStopped();
          }
        });
      });
    };
  }

////////////////////////////////////////////////////////////////////////////////////////////////////
  return {
    DrawingCanvas,
    newCanvas: function(w: number, h: number): DrawingCanvas {
      argCheck('newCanvas', arguments, ['number', 'number']);
      return new DrawingCanvas(w, h);
    },
    loadImageFromURL: loadURLHandler(EncapsulatedImage(createImageData(50, 50)), (runner: any, response: any) => {
      const stopifyRunner = runner.runner!,
            img = new Image();
      img.setAttribute('crossOrigin', 'Anonymous');

      img.onerror = () => {
        if (runner.isRunning) {
          stopifyRunner.continueImmediate({
            type: 'exception',
            stack: [],
            value: new Error(`Image could not be loaded`)
          });
        } else {
          runner.onStopped();
        }
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.setAttribute('height', String(img.height));
        canvas.setAttribute('width', String(img.width));
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        if (runner.isRunning) {
          stopifyRunner.continueImmediate({
            type: 'normal',
            value: EncapsulatedImage(imageData)
          });
        } else {
          runner.onStopped();
        }
      };

      response.blob().then((blob: any) => {
        img.src = URL.createObjectURL(blob);
      }).catch(() => {
        if (runner.isRunning) {
          stopifyRunner.continueImmediate({
            type: 'exception',
            stack: [],
            value: new Error(`Image URL could not be loaded`)
          });
        } else {
          stopifyRunner.pause(() => {});
        }
      });
    }),
    createImage: function(width: number, height: number, fill: [number, number, number]) {
      argCheck('createImage', arguments, ['number', 'number', 'object']);
      if (arguments.length !== 3) {
        throw new Error(`createImage expects 3 arguments, received ${arguments.length}`);
      }
      const img = EncapsulatedImage(createImageData(width, height));
      assertValidPixel(fill);
      for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
          img.setPixel(i, j, fill);
        }
      }
      return img;
    },
    getProperty: function(o: any, key: string) {
      argCheck('getProperty', arguments, ['object', 'string']);
      return o.hasOwnProperty(key) ? { found: true, value: o[key] } : { found: false };
    },
    setProperty: function(o: any, key: string, value: any) {
      if (arguments.length !== 3) {
        throw new Error(`setProperty expects 3 arguments, received ${arguments.length}`);
      }
      argCheck('setProperty', [o, key], ['object', 'string']);
      o[key] = value;
    },
    loadJSONFromURL: loadURLHandler([{/* tslint:disable:quotemark object-literal-key-quotes */
      "name": "Back-Health Chiropractic",
      "city": "Phoenix",
      "state": "AZ",
      "stars": 5,
      "review_count": 19,
      "attributes": {
        "AcceptsInsurance": true,
        "ByAppointmentOnly": true,
        "BusinessAcceptsCreditCards": true
      },
      "categories": [
        "Chiropractors",
        "Health & Medical"
      ]}, {
      "name": "TRUmatch",
      "city": "Scottsdale",
      "state": "AZ",
      "stars": 3,
      "review_count": 3,
      "attributes": {},
      "categories": [
        "Professional Services",
        "Matchmakers"/* tslint:enable:quotemark object-literal-key-quotes */
      ]}], (runner: any, response: any) => {
      response.json().then((jsonObj: any) => {
        runner.runner.continueImmediate({
          type: 'normal',
          value: config.stopifyObjectArrayRecur(jsonObj)
        });
      }).catch(() => {
        runner.isRunning ?
          runner.runner.continueImmediate({
            type: 'exception',
            stack: [],
            value: new Error(`JSON file could not be loaded`)
          }) :
          runner.runner.pause(() => {});
      });
    }),
    sleep: function(milliseconds: number) {
      argCheck('sleep', arguments, ['number']);
      if (typeof document === 'undefined') {
        return; // does not do anything if not run on browser
      }
      const runnerResult = config.getRunner();
      if (runnerResult.kind === 'error') {
        throw new Error('Program is not running');
      }
      const runner = runnerResult.value,
            stopifyRunner = runner.runner!;
      return stopifyRunner.pauseImmediate(() => {
        window.setTimeout(() => {
          if (runner.isRunning) {
            stopifyRunner.continueImmediate({ type: 'normal', value: undefined });
          } else {
            runner.onStopped();
          }
        }, milliseconds);
      });
    },
    input: function(message: string) {
      argCheck('input', arguments, ['string']);
      if (typeof document === 'undefined') {
        return 'user input is disabled'; // when run on GradeScope
      }
      const runnerResult = config.getRunner();
      if (runnerResult.kind === 'error') {
        throw new Error('Program is not running');
      }
      const runner = runnerResult.value,
            stopifyRunner = runner.runner!;
      return stopifyRunner.pauseImmediate(() => {
        const userInput = prompt(message);
        if (userInput === null) { // if user did not write anything/pressed cancel
          if (runner.isRunning) {
            stopifyRunner.continueImmediate({
              type: 'normal',
              value: '' // return empty string
            });
          } else {
            runner.onStopped();
          }
        }
        if (runner.isRunning) {
          stopifyRunner.continueImmediate({
            type: 'normal',
            value: userInput
          });
        } else {
          runner.onStopped();
        }
      });
    }
  };
}
