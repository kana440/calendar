/* eslint-disable */
// 定数定義
var constants = {
  // テキスト定義
  SUMMARY_DEFAULT_JA: '(予定あり)',
  // GAS定義値
  EVENT_CANCELLED: 'cancelled',
  // 入出力の設定
  getIo : getIoSpreadsheet,
}

var comments = [
  {
    statusCode: 'NG-others(event not exist)',
    status: 'danger',
    message: '会議室を取得できませんでした。',
    detail: '予定が存在しない、キャンセル、もしくは予定に招待されていないため、会議室を確保できませんでした。',
  },
  {
    resultsCode: 'NG-event cancelled(event not exists)',
    status: 'danger',
    message: '会議室を取得できませんでした。',
    detail: '予定がキャンセルされてたため、会議室を確保できませんでした。',
  },
  {
    resultsCode: 'NG-time overed',
    status: 'danger',
    message: '会議室を取得できませんでした。',
    detail: '過去の予定のため、会議室を確保しませんでした。',
  },
  {
    resultsCode: 'NG-room not authorized',
    status: 'danger',
    message: '会議室を取得できませんでした。',
    detail: '会議室を利用する権限がありません。',
  },
  {
    resultsCode: 'INFO-already added',
    status: 'info',
    message: '会議室は既に確保されています。',
    detail: 'Googleカレンダから会議室が取得されていることを確認してください。',
  },
  {
    resultsCode: 'NG-occupied',
    status: 'info',
    message: '会議室を取得できませんでした。',
    detail: '別の予定に会議室が取られているようです。他の会議室がないかGoogleカレンダから確認してください。',
  },
  {
    resultsCode: 'OK-added',
    status: 'success',
    message: '会議室を取得しました。',
    detail: 'Googleカレンダから確認してください。カレンダの「場所」は更新してませんので、必要に応じて編集し、ゲストへ更新通知してください。',
  },
  {
    resultsCode: 'NG-event not add authorized',
    status: 'danger',
    message: '会議室を取得できませんでした。',
    detail: 'その予定へ会議室を追加する権限がないようです。',
  },
  {
    resultsCode: 'NG-already declined',
    status: 'danger',
    message: '会議室を取得できませんでした。',
    detail: '予定が追加されていますが、拒否されています。別の予定に会議室が取られていないか確認してください',
  },
]


//array.findIndex, array.find(ES3環境のため自前で実装)
if (!Array.prototype.findIndex) {
  Array.prototype.findIndex = function(predicate) {
    if (this === null) {
      throw new TypeError('Array.prototype.findIndex called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return i;
      }
    }
    return -1;
  };
}

// https://tc39.github.io/ecma262/#sec-array.prototype.find
if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    value: function(predicate) {
     // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return kValue.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return kValue;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return undefined.
      return undefined;
    },
    configurable: true,
    writable: true
  });
}
