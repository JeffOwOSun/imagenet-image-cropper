"use strict";
var Jimp = require('jimp'),
    fs = require('fs'),
    xml2js = require('xml2js');

let imagefile="000000.JPEG";
let annotatefile="000000.xml";

//read the image
let imPromise = Jimp.read(imagefile)

//read the xml
let parser = new xml2js.Parser();
let xmlPromise = new Promise((resolve, reject)=>{
    fs.readFile(annotatefile, (err, data)=>{
        if (err) reject(err);
        //parseString returns a promise
        resolve(data);
    });
}).then(data=>{
    console.log(data);
    return new Promise((resolve, reject)=>{
        parser.parseString(data, (err, result)=>{
            if (err) reject(err);
            console.dir(result);
            console.log('xml parsing Done');
            resolve(result);
        });
    });
});

//wait until both are finished
Promise.all([imPromise, xmlPromise]).then(res=>{
    let [im, xml]=res;
    //console.log(res);
    console.log('All done!');
}).catch(err=>{
    console.log(err);
});
