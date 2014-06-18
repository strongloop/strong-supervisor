var explitive = process.argv.length > 2
              ? process.argv.slice(2).join(' ')
              : 'yes';

setInterval(console.log.bind(console, explitive), 500);
