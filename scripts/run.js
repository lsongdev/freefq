#!/usr/bin/env node

const fs = require("fs");
const YAML = require("js-yaml");
const pkg = require("../package.json");

const { writeFile } = fs.promises;
const writeYaml = (filename, obj) =>
  writeFile(filename, YAML.dump(obj));

function parseURL(url) {
  const pattern = /^((\w+):\/\/)?((\S+)?@)?([^\/\?:]+):?(\d+)?(\/?[^\?#]+)?\??([^#]+)?#?(.*)/;
  const match = pattern.exec(decodeURIComponent(url));
  return Object.entries({
    url: 0,
    protocol: 2,
    auth: 4,
    host: 5,
    port: 6,
    path: 7,
    querystring: 8,
    hash: 9,
  }).reduce((out, [k, v]) => (out[k] = match[v] || '', out), {});
}

const handlers = {}

const registerHandler = (proto, handler) => {
  handlers[proto] = handler
};

registerHandler('vmess', (data, link) => {
  const vmess = JSON.parse(Buffer.from(data, 'base64'));
  const output = {
    type: "vmess",
    name: vmess.ps,
    server: vmess.add,
    port: vmess.port,
    uuid: vmess.id,
    alterId: vmess.aid,
    cipher: "auto",
    network: vmess.net,
    tls: vmess.tls == 'tls',
    'skip-cert-verify': true,
  };
  if (vmess.sni) {
    output.sni = vmess.sni;
  }
  if (vmess.alpn) {
    output.alpn = vmess.alpn;
  }
  const opts = `${vmess.net}-opts`;
  output[opts] = output[opts] || {};
  if (vmess.host) {
    output[opts]["host"] = vmess.host;
    output[opts]["headers"] = {
      "host": vmess.host,
    }
  }
  if (vmess.path) {
    output[opts]["path"] = vmess.path;
  }
  return output;
});

registerHandler('trojan', (_, link) => {
  const data = parseURL(link);
  return {
    name: data.hash,
    type: data.protocol,
    server: data.host,
    port: data.port,
    password: data.auth,
    'skip-cert-verify': true,
    alpn: ["h2", "http/1.1"]
  };
});

const ss = (_, link) => {
  const data = parseURL(link);
  const [cipher, password] = Buffer.from(data.auth, 'base64').toString().split(':');
  return {
    name: data.hash,
    type: data.protocol,
    server: data.host,
    port: data.port,
    cipher,
    password,
    udp: true,
  };
};

registerHandler('ss', ss);
registerHandler('ssr', ss);

function parse_link(link) {
  const [proto, content] = link.split('://');
  if (proto in handlers) {
    return handlers[proto](content, link);
  } else {
    console.log(`Unknown protocol: ${proto}`);
  }
}

async function convert_sub(content) {
  const links = content.split(/\r?\n/g).filter(Boolean);
  return Promise.all(links.map(parse_link));
}

async function main() {
  for (const [name, url] of Object.entries(pkg.links)) {
    const response = await fetch(url);
    const content = Buffer.from(await response.text(), 'base64').toString();
    const proxies = await convert_sub(content);
    writeYaml(`./proxies/${name}.yaml`, { 
      proxies: proxies.filter(Boolean) 
    });
  }
}

main();