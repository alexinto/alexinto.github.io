// Получение ссылок на элементы UI
let connectButton = document.getElementById('connect');
let connect2Button = document.getElementById('connect2');
let disconnectButton = document.getElementById('disconnect');
let terminalContainer = document.getElementById('terminal');
let sendForm = document.getElementById('send-form');
let inputField = document.getElementById('input');
let led_red = document.led_red;
let led_green = document.led_green;

// Подключение к устройству при нажатии на кнопку Connect
connectButton.addEventListener('click', function() {
  connect();
});
connect2Button.addEventListener('click', function() {
  connect_cc2541();
});
led_red.addEventListener('click', function() {
  red_on();
});
led_green.addEventListener('click', function() {
  green_on();
});

let init = null;

function red_on() {
 let val = "red off";
 if (led_red.value == 0)
     val = "red on";
 send(val);
}
function green_on() {
let val = "green off";
 if (led_green.value == 0)
     val = "green on";
 send(val);
}

function initing() {
 let val = "red off";
 let val_green = "green off";
 if (init == null) {
	 if (led_red.value != 0)
	      send(val);
         else if (led_green.value != 0)
	      send(val_green);
	 else
	     init = 1; 
 }
 if (init == null)
     setTimeout(initing, 1000);
}

// Отключение от устройства при нажатии на кнопку Disconnect
disconnectButton.addEventListener('click', function() {
  disconnect();
});

// Обработка события отправки формы
sendForm.addEventListener('submit', function(event) {
  event.preventDefault(); // Предотвратить отправку формы
  send(inputField.value); // Отправить содержимое текстового поля
  inputField.value = '';  // Обнулить текстовое поле
  inputField.focus();     // Вернуть фокус на текстовое поле
});

// Кэш объекта выбранного устройства
let deviceCache = null;
// Запустить выбор Bluetooth устройства и подключиться к выбранному
function connect() {
  return (deviceCache ? Promise.resolve(deviceCache) :
      requestBluetoothDevice()).
      then(device => connectDeviceAndCacheCharacteristic(device)).
      then(characteristic => startNotifications(characteristic)).
      catch(error => log(error));
}
function connect_cc2541() {
  return (deviceCache ? Promise.resolve(deviceCache) :
      requestBluetoothDevice_cc2541()).
      then(device => connectDeviceAndCacheCharacteristic_cc2541(device)).
      then(characteristic => startNotifications(characteristic)).
      catch(error => log(error));
}

// Подключение к определенному устройству, получение сервиса и характеристики
let characteristicCache = null;
let characteristicWrCache = null;

// Подключение к определенному устройству, получение сервиса и характеристики
function connectDeviceAndCacheCharacteristic(device) {
  if (device.gatt.connected && characteristicCache) {
    return Promise.resolve(characteristicCache);
  }

  log('Connecting to GATT server...');
  device.gatt.connect().
	then(server => {
	log('GATT server connected, getting service...');
	return server.getPrimaryService(0xFFE0);
	}).
	then(service => {
	log('Service found, getting characteristic...');
	return service.getCharacteristic(0xFFE2);
	}).
	then(characteristic => {
	log('Characteristic write found');
	characteristicWrCache = characteristic;
	return characteristicWrCache;
	  });

  return device.gatt.connect().
      then(server => {
        return server.getPrimaryService(0xFFE0);
      }).
      then(service => {
        return service.getCharacteristic(0xFFE1);
      }).
      then(characteristic => {
        log('Characteristic notification found');
        characteristicCache = characteristic;
        return characteristicCache;
      });
}
function connectDeviceAndCacheCharacteristic_cc2541(device) {
  if (device.gatt.connected && characteristicCache) {
    return Promise.resolve(characteristicCache);
  }

  log('Connecting to GATT server...');
  device.gatt.connect().
	then(server => {
	log('GATT server connected, getting service...');
	return server.getPrimaryService(0xFFF0);
	}).
	then(service => {
	log('Service found, getting characteristic...');
	return service.getCharacteristic(0xFFF3);
	}).
	then(characteristic => {
	log('Characteristic write found');
	characteristicWrCache = characteristic;
	return characteristicWrCache;
	  });

  return device.gatt.connect().
      then(server => {
        return server.getPrimaryService(0xFFF0);
      }).
      then(service => {
        return service.getCharacteristic(0xFFF4);
      }).
      then(characteristic => {
        log('Characteristic notification found');
        characteristicCache = characteristic;
        return characteristicCache;
      });
}
// Вывод в терминал
function log(data, type = '') {
  terminalContainer.insertAdjacentHTML('beforeend',
      '<div' + (type ? ' class="' + type + '"' : '') + '>' + data + '</div>');
      terminalContainer.scrollTop = 999999999;
}

// Запрос выбора Bluetooth устройства
function requestBluetoothDevice() {
  log('Requesting bluetooth device...');

  return navigator.bluetooth.requestDevice({
    filters: [{services: [0xFFE0]}],
  }).
      then(device => {
        log('"' + device.name + '" bluetooth device selected');
        deviceCache = device;

        // Добавленная строка
        deviceCache.addEventListener('gattserverdisconnected',
            handleDisconnection);

        return deviceCache;
      });
}
function requestBluetoothDevice_cc2541() {
  log('Requesting bluetooth device...');

  return navigator.bluetooth.requestDevice({
    filters: [{services: [0xFFF0]}],
  }).
      then(device => {
        log('"' + device.name + '" bluetooth device selected');
        deviceCache = device;

        // Добавленная строка
        deviceCache.addEventListener('gattserverdisconnected',
            handleDisconnection);

        return deviceCache;
      });
}

// Обработчик разъединения
function handleDisconnection(event) {
  let device = event.target;

  log('"' + device.name +
      '" bluetooth device disconnected, trying to reconnect...');
  
  connectDeviceAndCacheCharacteristic_cc2541(device).
      then(characteristic => startNotifications(characteristic)).
      catch(error => log(error));
}
// Включение получения уведомлений об изменении характеристики
function startNotifications(characteristic) {
  let val = "red off";
  log('Starting notifications...');

  return characteristic.startNotifications().
      then(() => {
        log('Notifications started');
        // Добавленная строка
        characteristic.addEventListener('characteristicvaluechanged',
            handleCharacteristicValueChanged);
        init = null;
        led_red.value = 1;
        led_green.value = 1;
        setTimeout(initing, 1000);
      });
}

// Отключиться от подключенного устройства
function disconnect() {
  if (deviceCache) {
    log('Disconnecting from "' + deviceCache.name + '" bluetooth device...');
    deviceCache.removeEventListener('gattserverdisconnected',
        handleDisconnection);

    if (deviceCache.gatt.connected) {
      deviceCache.gatt.disconnect();
      log('"' + deviceCache.name + '" bluetooth device disconnected');
    }
    else {
      log('"' + deviceCache.name +
          '" bluetooth device is already disconnected');
    }
  }

  // Добавленное условие
  if (characteristicCache) {
    characteristicCache.removeEventListener('characteristicvaluechanged',
        handleCharacteristicValueChanged);
    characteristicCache = null;
  }
  characteristicWrCache = null;
  deviceCache = null;
}

// Промежуточный буфер для входящих данных
let readBuffer = '';

// Получение данных
function handleCharacteristicValueChanged(event) {
let value = new TextDecoder().decode(event.target.value);
//  let value = event.target.value;
//  let a = [];
//  let perc = [];
  // Convert raw data bytes to hex values just for the sake of showing something.
  // In the "real" world, you'd use data.getUint8, data.getUint16 or even
  // TextDecoder to process raw data bytes.
//  for (let i = 0; i < value.byteLength; i++) {
//    a.push('0x' + ('00' + value.getUint8(i).toString(16)).slice(-2));
//  }
//  receive(a);
//  perc.push('Percent: ' + ('00' + value.getUint8(7).toString(10)).slice(-2) + '%'); 
//  receive(perc);
  receive(value);
}

// Обработка полученных данных
function receive(data) {

  if (data == "Red: On") {
     led_red.src = 'Images/led_red.gif';
     led_red.value = 1;
     }
  if (data == "Red: Off") {
     led_red.src = 'Images/led_off.gif';
     led_red.value = 0;
     }
  if (data == "Green: On") {
     led_green.src = 'Images/led_green.gif';
     led_green.value = 1;
     }
  if (data == "Green: Off") {
     led_green.src = 'Images/led_off.gif';
     led_green.value = 0;
     }
  let data_log = "BT ===> " + data;
  log(data_log, 'in');
}

// Отправить данные подключенному устройству
function send(data) {
  data = String(data);

  if (!data || !characteristicWrCache) {
    return;
  }

  if (data.length > 20) {
    let chunks = data.match(/(.|[\r\n]){1,20}/g);

    writeToCharacteristic(characteristicWrCache, chunks[0]);

    for (let i = 1; i < chunks.length; i++) {
      setTimeout(() => {
        writeToCharacteristic(characteristicWrCache, chunks[i]);
      }, i * 100);
    }
  }
  else {
    writeToCharacteristic(characteristicWrCache,data);
  }
  let data_log = "BT <=== " + data;
  log(data_log, 'out');
}
// Записать значение в характеристику
function writeToCharacteristic(characteristic, data) {
	characteristic.writeValue(new TextEncoder().encode(data));
//  characteristic.writeValue(new Uint8Array([58,7,1,4,0,-56,0,29]));
}