"use strict";
var Jimp = require('jimp'),
    fs = require('fs'),
    xml2js = require('xml2js'),
    path = require('path'),
    mkdirp = require('mkdirp');

let ilsvrc_dir="./ilsvrc2015-sample/",
    imageset_dir=path.join(ilsvrc_dir,'ImageSets/VID'),
    anno_dir=path.join(ilsvrc_dir,'Annotations/VID'),
    data_dir=path.join(ilsvrc_dir,'Data/VID'),
    devkit_dir=path.join(ilsvrc_dir,'devkit/data'),
    img_save_dir=path.join(ilsvrc_dir,'Data/cropped');

let class_map={}
fs.readFileSync(path.join(devkit_dir, 'map_vid.txt'), 'utf8')
.trim().split('\n').map(line=>{
  line=line.split(' ');
  class_map[line[0]]={
    idx: line[1],
    name: line[2],
  }
});
//console.dir(class_map);

//read the imagesets
console.log("read imagesets");
let imagesets=fs.readdirSync(imageset_dir).filter(item=>{
  return '.txt'==path.extname(item);
});

let write_streames={
  'train':fs.createWriteStream('train.txt',{
    flags: 'w',
    defaultEncoding: 'utf8',
    fd: null,
    mode: 0o666,
    autoClose: true
  }),
  'val':fs.createWriteStream('val.txt',{
    flags: 'w',
    defaultEncoding: 'utf8',
    fd: null,
    mode: 0o666,
    autoClose: true
  }),
  'test':fs.createWriteStream('test.txt',{
    flags: 'w',
    defaultEncoding: 'utf8',
    fd: null,
    mode: 0o666,
    autoClose: true
  }),
};
console.log("process training");
let root_promise=Promise.all(imagesets.map(imageset=>{
  imageset = path.join(imageset_dir, imageset);
  let filename = path.basename(imageset, '.txt');
  let parts, label, filetype;
  if (parts = filename.match(/train_(.*)/)) {
    label = parts[1];
    filetype = 'train';
  } else if (parts = filename.match(/val/)) {
    filetype = 'val';
    console.log("validation set");
  } else if (parts = filename.match(/test/)) {
    filetype = 'test';
    console.log("test set");
  }
  //open the imageset txt
  return readFile(imageset, 'utf8').then(contents=>{
    return Promise.all(contents.split('\n').map(line=>{
      let snippet_id=line.split(' ')[0];
      //consturct the dirs
      let xml_dir=path.join(anno_dir,filetype,snippet_id);
      let img_dir=path.join(data_dir,filetype,snippet_id);
      mkdirp(path.join(img_save_dir,filetype, snippet_id),err=>{
        if (err) throw err;
      });

      //fetch the xml
      return readdir(xml_dir).then(arr=>{
        return Promise.resolve(arr.filter(item=>{
          return '.xml'===path.extname(item);
        }));
      }).then(xmls=>{
        return Promise.all(xmls.map(xmlname=>{
          //for each xmlname
          //get the imagename
          let imgname=path.basename(xmlname,'.xml')+'.JPEG';
          imgname=path.join(img_dir,imgname);
          xmlname=path.join(xml_dir,xmlname);
          
          //console.log(imgname);
          //console.log(xmlname);
          return Promise.all([
            //extract the boxes from xml
            read_xml(xmlname).then(xml=>{
              //console.log(xml);
              let boxes=extract_boxes(xml);
              //console.log(boxes);
              return Promise.resolve(boxes);
            }),
            //read the image
            Jimp.read(imgname),
          ]).then(res=>{
            let boxes=res[0];
            let im=res[1];
            //for every box
            return Promise.all(boxes.map((box,idx)=>{
              //crop the image
              let cropped_img=crop_image(im, box.coord);
              //save the image, together with the text file, saying 
              /**TODO: Is it possible that we have multiple different labels in 
               * one frame?
               */
              let outimgname=path.join(snippet_id,
                    path.basename(imgname,'.JPEG')+String(idx)+'.JPEG');
              //this one is a promise
              write_streames[filetype].write(outimgname+' '+class_map[box.name].idx+'\n');
              return cropped_img.write(path.join(img_save_dir,filetype,outimgname));
            }));
          });
        }));
      });
    }));
  });
})).then(()=>{
  console.log("the end of execution!");
  write_streames['train'].end();
  write_streames['test'].end();
  write_streames['val'].end();
}).catch(err=>{
  throw err;
});

let ws=fs.createWriteStream('test.txt');
ws.write("yo");
ws.end();

function readdir(dir) {
  return new Promise((resolve, reject)=>{
    fs.readdir(dir, (err, data)=>{
      if (err) reject(err);
      resolve(data);
    })
  });
}

function readFile(file, opt) {
  return new Promise((resolve,reject)=>{
    fs.readFile(file, opt, (err,data)=>{
      if (err) reject(err);
      resolve(data);
    });
  });
}

function read_xml(xmlfile) {
  //console.log(`reading ${xmlfile}`);
  //read the xml
  let parser = new xml2js.Parser();
  let xmlPromise = new Promise((resolve, reject)=>{
      fs.readFile(xmlfile, (err, data)=>{
          if (err) reject(err);
          //parseString returns a promise
          resolve(data);
      });
  }).then(data=>{
      return new Promise((resolve, reject)=>{
          parser.parseString(data, (err, result)=>{
              if (err) reject(err);
              //console.log("resolving read_xml");
              //console.dir(result);
              resolve(result);
          });
      });
  });
  return xmlPromise;
}

function extract_boxes(xml) {
  return xml.annotation.object.map(obj=>{
    let bndbox = obj.bndbox[0];
    let box = {
      coord: [
        bndbox.xmin[0],
        bndbox.ymin[0],
        bndbox.xmax[0]-bndbox.xmin[0],
        bndbox.ymax[0]-bndbox.ymin[0],
      ].map(Number),
      name: obj.name,
    }
    //console.dir(box);
    return box;
  });
}

function crop_image(im, coord) {
  return im.clone()
    .crop(...coord)
    .resize(256, 256);
}
