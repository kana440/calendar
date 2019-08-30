// doGet
function doGet(request) {
  var tmp = HtmlService.createTemplateFromFile('client/index');
  return tmp.evaluate().setTitle('会議室取得ツール');
}

// gasのファイル(html)をインポートする
// html上で使うときは<?!=include('filename');?>とする
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
    .getContent();
}
