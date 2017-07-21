'use strict';

const Hapi = require('hapi');
const Good = require('good');
const exec = require('child_process').exec;

const NodeRSA = require('node-rsa');
const fs = require('fs');
const keyContent = '-----BEGIN RSA PRIVATE KEY-----\n'+
'MIIEpQIBAAKCAQEAwcxwr3XZLtmBPyTa8K4drR7x0WQwk13wqbK2iJcBZSUo7xEF\n'+
'GrScG1ahYat0d/1aBFmjwsquBerk2pcRNQon23I5KeqzRbDDvafcbNNchcu+uPd+\n'+
'mHzg9IZXhwYLCZOXDvP80LdUcXmjPzUG96ZEtzjlAYJNh3aklP6+ct4ZH9hJpi73\n'+
'VJmf1u3QszbgJcDtGrCOzKrWA8t1T/HdQvP5VKPbFwVUjBNEIHaYeqdYHDNQ0dc0\n'+
'TW9gPEwcXuV6pU23Qe3hyHHpvgonRg+ipXTWLC904rqqb2IpAcAjEpAXjnDcunCR\n'+
'LhuSrlW8clPICMc5ub5GWff5eXMpMoHzu+OW5QIDAQABAoIBADCF2J0F+8fwK508\n'+
'xBjI76M+ATv1QvhS6AQFPBC9Bltlz3b0IvwJxqBNs4B55mJ4q8Y1D3yhNKtEoeJd\n'+
'OrC2Bz65vbhSDGrhlFDzK4yP6zWQywMS7L6PXd+7l0S2baMLMiJLUryLengjBY24\n'+
'4DK3jbL2athS4MiPGyw3EEZAd7fyBww58LX7KRt2FP7uVCIwH+iX4cFd6GNtpLtQ\n'+
'YGLz0ib93q31P/8Vuy03rgrmXAJewYCVDF/ZK4WPFfe08mcfLmTHyYPmmu/Vgv6N\n'+
'QmTPZMiFx0yvuwumtp7GyzpoOCpYAbNB6huV5RnezHq91i9HkzytaR6BMBBnj6dW\n'+
'hC9znsECgYEA3/72wG/UAdoEc7O2CjKNbecZBe2uENtSDslyk6GDcoqc7lGypMvc\n'+
'XH07DOXAW2ZeDTO+ilFhghRCnwvqnHlftqjPUakBi5VQf60IHMZKgwsBkwzSGoEQ\n'+
'reiChNlIDDPY3ZpaUfJmYGKcfX65nQEV1DzSwA3wOafVxZyVvz6oJjUCgYEA3Xz0\n'+
'xX1ihFhw2j6G61DJ6A/CXr5y1AVTAOJe93Q5W+uFwItJo3esVLjTrxy0VNx7G1h5\n'+
'qEUjJF2yGVrcIb1C5V/oMC4qIj5fZ4nMdSlqK9DfAVu8Klh4+pV7bg9KqAsiWOf1\n'+
'tnsgaasIaqBhaX7T0fmIQeMXg2LaJ53Ad3sxA/ECgYEA0qOT7QD8UEVx3FAKBurk\n'+
'/o3MhTuubaGhN9COU3AWCVd6Hc5r/PbMIZmONyGy0wCfvzCCpNXEqStePuxY0o58\n'+
'yGtUkkko79cY3QedUlnR5gsqjtsGlO/7/F5ipoUhcIAtFq848kjNpyP0XzsVVySX\n'+
'H3+W/A3fcoh2yZ7nXvGP9GUCgYEAzgelnWv0T44BdFKDqLOfDbpTIVThde559rGc\n'+
'i21WyfW9lo0688+nw6umZhc6fFIYRii4Clo9xV9PA5zsdooah0n+r4rR8Ma6cpLR\n'+
'WQ8sTxPdzeKql21zJA4XIhshZE3vJmqnu5avYPwTOTR1SPAMVB9dq4R2Y+Z5bi6l\n'+
'Ub+LqdECgYEAiExIPLosQihg6CAmuyD7wtEyZjLEixYnhq0s0S9IPa+mnRFEBwYv\n'+
'cFrTfaGA4IME49D4BwafMPwbyokBkeRqig9eDgxTUkTglAiNulrVavVJDN0txdZb\n'+
'Nt6dDhtEGE0sGNvYhbXC+bN3RyKVBhlumF0JHS5gg4nERnJg7xDeTcc=\n'+
'-----END RSA PRIVATE KEY-----';
const key = new NodeRSA();
let unique

const server = new Hapi.Server();
server.connection({ port: 6881, host: 'localhost' });

let cmd = "echo $(dmidecode -t 4 | grep ID | sed 's/.*ID://;s/ //g') $(ifconfig | grep eth0 | awk '{print $NF}' | sed 's/://g') | sha256sum | awk '{print $1}'"

unique = exec(cmd,function (err,stdout,stderr){
   server.log('info',`System Key: ${stdout}`);
   let unique = stdout;
});

//route
server.route({
   method: 'GET',
   path: '/getUniqueKey',
   handler: function(request,reply){
      reply(unique);
   }
});
server.route({
   method: 'GET',
   path: '/getLicense',
   handler: function(request,reply){
     const licenseContent = fs.readFileSync('/etc/unixcape/licenseKey', 'utf8');
     key.importKey(keyContent,'private')
     let decrypted = key.decrypt(lincense, 'utf8');
     server.log('info','decrypted: ', decrypted);
     let license = JSON.parse(decrypted);
     if (license.system.unique == unique){
       reply(decrypted);
       return;
     }
   }
});
server.route({
   method: 'POST',
   path: '/activate/{key}',
   handler: function(request,reply){
     fs.writeFile("/etc/unixcape/licenseKey", request.params.key,function(err){
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
