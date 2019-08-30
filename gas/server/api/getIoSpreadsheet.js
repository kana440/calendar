/*
//  // コンフィグ割当
//  const getIo = getIoSpreadsheet;
//  // 呼び出し
//  const io = getIo()
//  var records = io.getRecords()
//  var result = io.setRecord()
}
*/
function getIoSpreadsheet() {
  // コンストラクタ
  const SPREAD_ID = PropertiesService.getScriptProperties().getProperty('spreadId')
  if (!SPREAD_ID) {
    throw {
      message: 'no spreadId fount in script properties'
    }
  }
  // 初期化（設定値取得）
  const _spread = SpreadsheetApp.openById(SPREAD_ID)
  const _sheets = {}

  // ioを返す。get[*](*はオブジェクト名)で利用
  return {
    getUserSettings: function(payload){
      return this._getData('userSettings', payload)
    },
    getRooms: function(payload){
      return this._getData('rooms',payload)
    },
    getWatchList: function(payload){
      return this._getData('watchList',payload)
    },
    setUserSettings: function(payload){
      this._setData('userSettings',{
        keys: ['email'],
        record: payload,
      })
    },
    setWatchList: function(payload){
      this._setData('watchList', {
        keys: ['subscriber', 'eventId'],
        record: payload,
      })
    },

    //内部利用
    _spread: _spread,
    _sheets: _sheets,
    _getData: function(sheetName, payload){
      //payload
      const filter = !payload || !payload.filter ? [] : payload.filter

      //スプレッドから配列取得
      if(!this._sheets[sheetName]){
        this._sheets[sheetName] = this._spread.getSheetByName(sheetName)
      }
      const sheet = this._sheets[sheetName]
      const data = sheet.getDataRange().getValues()
      const headerType = data.shift()
      const header = data.shift()

      //filterの作成
      const attrs = Object.keys(filter).map(function(key){
        const index = header.findIndex(function(item){
          return item === key
        })
        if(index === -1) throw ('key not found:'+ key )
        return {
          key: key,
          index: index,
        }
      })
      //filterに合致するものを配列として読み出し
      const result = data.filter(function(line){
       return attrs.every(function(attr){
         return line[attr.index] === filter[attr.key]
       })
      }).map(function(line){
        const obj = {}
        header.forEach(function(attr, i) {
          if(line[i] === 'undefined') {
            obj[header[i]] = null
            return
          }
          switch(headerType[i]){
            case 'Array': {
              obj[header[i]] = JSON.parse(line[i])
              return
            }
            default: {
              obj[header[i]] = line[i]
              return
            }
          }
        })
        return obj
      })
      return result
    },

    _setData: function(sheetName, payload){
      const keys = !payload || !payload.keys ? [] : payload.keys
      const record = payload.record

      //スプレッドから配列取得
      if(!this._sheets[sheetName]){
        this._sheets[sheetName] = this._spread.getSheetByName(sheetName)
      }

      const sheet = this._sheets[sheetName]
      const data = sheet.getDataRange().getValues()
      const headerType = data.shift()
      const header = data.shift()

      const attrs = keys.map(function(key){
        const index = header.findIndex(function(item){
          return item === key
        })
        if(index === -1) throw ('key not found:'+ key )
        return {
          key: key,
          index: index,
        }
      })
      var i
      if(keys.length === 0) {
        i = data.length
      } else {
        i = data.findIndex(function(line){
          return attrs.every(function(attr){
              return record[attr.key] === line[attr.index]
          })
        })
        if( i === -1 ) i = data.length
      }
      sheet.getRange(i+3,1,1,header.length)
      .setValues([
        header.map(function(attr,i) {
          switch(headerType[i]){
            case 'Array': {
              return JSON.stringify(record[attr])
            }
            default: {
              return record[attr]
            }
          }
        })
      ])
      return 'updated'
    },
  }
}
