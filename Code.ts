declare function ImportJSON(url: string, query: string, parseOptions: string) : Array<Array<string>>;

let config = {};
let alias;

/**
 * Convert the configuration from the tab Config into a dictionary of lists of configs.
 * 
 */
// TODO(filipe): This function could use a serious cleanup.
// TODO(filipe): Create a type networks object
function refreshConfig(): void {
  var sheet = SpreadsheetApp.getActive().getSheetByName("Config");
  var data = sheet.getDataRange().getValues();
  data.forEach(function (row) {

    if (!(row[0] in config)) {
      config[row[0]] = {};
    }
    config[row[0]][row[1]] = row.slice(2, 10);
  });

  alias = new Map();
  for(var address of Object.keys(config['alias'])) {
    alias.set(config['alias'][address][0], address);
  }
}

/**
 * Returns a table with all the ERC20 transactions for a particular address.
 * 
 * @param address Blockchain address to query
 * @returns 
 */
function TransactionsERC20(address : string) {
  refreshConfig();

  var output: Array<Array<string>> = [];
  let index: number = 0;

  for (let network of Object.keys(config['network'])) {
    output = [...output, ...importNetworkTransactions(address, network, index)];
    index++;
  }

  return output;
}

function importNetworkTransactions(address : string, network : string, index : number) {
  var [api, key] = config['network'][network];

  // TODO(filipe): Maybe use the defaultTransform_ argument of ImportJSONAdvanced(...) to implement filters.
  let url: string = `https://${api}/api?module=account&action=tokentx&address=${address}&sort=asc&apikey=${key}`;
  var input: Array<Array<string>> = ImportJSON(url, "/result", "allHeaders");
  var header: Array<string> = input.shift();
  var output: Array<Array<string>> = [];


  // TODO(filipe): Find a better way here. A little hacky in order to only output the header once.
  if (index == 0) {
    output.push(["Network", ...header]);
  }

  // Add network name to the first column
  for (var row of input) {
    let newRow = filterRow(row, network, address);
    output.push(newRow);
  }    

  return output;
}

const noFilter = (x : string) => x;
const dateFilter = (x : string) => { return new Date(parseInt(x) * 1000).toString() };
const aliasFilter = (x : string) => {
  return alias.has(x) ? `${alias.get(x)} (${x})` : x;
}

// TODO(filipe): Add a filter to linkify blocks, transactions and addresses. Unclear if this can be done as a function though.
const filters = [
  noFilter,    // Blocknumber
  dateFilter,  // Date
  noFilter,    // hash
  noFilter,    // Nonce
  noFilter,    // Blockhash
  aliasFilter, // From
  aliasFilter, // Contact Address
  aliasFilter  // To
]


function filterRow(row: string[], network : string, address : string) {
  for(let i = 0; i < filters.length; i++) {
    row[i] = filters[i](row[i]);
  }

  return [network, ...row];
}
