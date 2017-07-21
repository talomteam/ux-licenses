'use strict';

const Hapi = require('hapi');
const Good = require('good');
const exec = require('child_process').exec;

const NodeRSA = require('node-rsa');
const fs = require('fs');
const key = new NodeRSA();
let unique

const server = new Hapi.Server();
server.connection({ port: 3000, host: 'localhost' });

let cmd = "echo $(dmidecode -t 4 | grep ID | sed 's/.*ID://;s/ //g') $(ifconfig | grep eth0 | awk '{print $NF}' | sed 's/://g') | sha256sum | awk '{print $1}'"

unique = exec(cmd,function (err,stdout,stderr){
   server.log('info',`stdout: ${stdout}`);
   server.log('info',`stderr: ${stderr}`);
});


//route
server.route({
   method: 'GET',
   path: '/generate',
   handler: function(request,reply){
      reply(unique);
   }
});
server.route({
   method: 'GET',
   path: '/validate/{key}',
   handler: function(request,reply){
     const keyContent = fs.readFileSync('./key.pem', 'utf8');
     const licenseContent = fs.readFileSync('./license', 'utf8');
     key.importKey(keyContent,'private')
     let decrypted = key.decrypt(lincense, 'utf8');
     server.log('info','decrypted: ', decrypted);
     let license = JSON.parse(decrypted);
     if (license.system.unique == unique){
       reply(decrypted);
       return;
     }
     reply(decrypted);
   }
});
server.route({
   method: 'POST',
   path: '/activate/{key}',
   handler: function(request,reply){
     fs.writeFile("/etc/unixcape/license", "",function(err){
       server.log('info','license was saved')
     });
     reply();
   }
});
server.register({
   register: Good,
   options: {
      reporters: {
         console:[{
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{
               response: '*',
               log: '*'
            }]
         },
         {
             module: 'good-console'
         },'stdout']
      }
   }
},(err) => {
   if (err){
      throw err;
   }
   server.start((err) => {

       if (err) {
           throw err;
       }
       server.log('info',`Server running at: ${server.info.uri}`);
   });
});
