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

function test() {
  const properties = PropertiesService.getScriptProperties();
  if( !properties.getProperty('scriptId') ){
    Logger.log('no scriptId');
    properties.setProperty('spreadId','1-RkJT08sJV3BZwBzOkaL1vMJ0I30i9e7XiOxx9sHzCw')
  } else {
    Logger.log('spreadId is' + properties.getProperty('scriptId'));
  }
}

function getUserSettings() {
  const currentUser = Session.getActiveUser().getEmail()
  const io = constants.getIo()
  const userSettings = io.getUserSettings()
  const result = userSettings.find(function(item) {
    return item.email === currentUser
  })
  if(!result) {
    // error のとき
    return { email: currentUser }
  }
  return result
}

function setUserSettings(payload) {
  const currentUser = Session.getActiveUser().getEmail()
  if(payload.email !== currentUser) throw 'current user error'
  const io = constants.getIo()
  io.setUserSettings(payload)
}

function getRooms(){
  const io = constants.getIo()
  const rooms = io.getRooms()
  return JSON.parse(JSON.stringify(rooms));
}

function getWatchList() {
  const io = constants.getIo()
  const watchList = io.getWatchList()
  return JSON.parse(JSON.stringify(watchList))
}
