/* globals focalStorage */
(function () {

function log(msg) {
  console.log(msg);
  main.innerHTML += '<p>' + msg + '</p>';
}

function error(msg) {
  console.error(msg);
  main.innerHTML += '<p class="error">' + msg + '</p>';
}

focalStorage.setItem('key1', 'value').then(function (value) {
  log('key1 set to "%s"', value);
}, function (err) {
  error(err);
}).then(

  focalStorage.setItem('key2', 'value2').then(function (value) {
    log('key2 equals "%s"', value);
  }, function (err) {
    error(err);
  })

).then(

  focalStorage.getItem('key1').then(function (value) {
    log('key1 equals "%s"', value);
  }, function (err) {
    error(err);
  })

).then(

  focalStorage.length().then(function (value) {
    log('length is %s', value);
  }, function (err) {
    error(err);
  })

).then(

  focalStorage.key(0).then(function (value) {
    log('key at index 0 is %s', value);
  }, function (err) {
    error(err);
  })

).then(

  focalStorage.removeItem('key1').then(function () {
    log('key1 was removed!');
  }, function (err) {
    error(err);
  })

).then(

  focalStorage.length().then(function (value) {
    log('length is %s', value);
  }, function (err) {
    error(err);
  })

).then(

  focalStorage.clear().then(function () {
    log('cleared');
  }, function (err) {
    error(err);
  })

).then(

  focalStorage.length().then(function (value) {
    log('length is %s', value);
  }, function (err) {
    error(err);
  })

).catch(error);

})();
