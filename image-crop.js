"use strict";
var Jimp = require('jimp'),
    fs = require('fs'),
    xml2js = require('xml2js');

let imagefile="000000.JPEG";
let annotatefile="000000.xml";

//read the image
let imPromise = Jimp.read(imagefile);

//read the xml
let parser = new xml2js.Parser();
let xmlPromise = new Promise((resolve, reject)=>{
    fs.readFile(annotatefile, (err, data)=>{
        if (err) reject(err);
        //parseString returns a promise
        resolve(data);
    });
}).then(data=>{
    return new Promise((resolve, reject)=>{
        parser.parseString(data, (err, result)=>{
            if (err) reject(err);
            resolve(result);
        });
    });
});

//wait until both are finished
Promise.all([imPromise, xmlPromise]).then(res=>{
    let im = res[0],
        xml = res[1];
    //console.log(res);
    xml.annotation.object.forEach(obj=>{
      obj.bndbox.forEach(bndbox=>{
        let box = [
          bndbox.xmin[0],
          bndbox.ymin[0],
          bndbox.xmax[0]-bndbox.xmin[0],
          bndbox.ymax[0]-bndbox.ymin[0],
        ].map(Number);
        im.clone()
          .crop(...box)
          .resize(256, 256)
          .write('000000cropped.JPEG');
      });
    });
}).catch(err=>{
    console.error(err);
});
