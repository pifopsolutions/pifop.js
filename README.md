# PIFOP Functions JavaScript API

> **Warning**:
> [PIFOP Functions](https://pifop.com/help/functions_intro.html) is an experimental feature, and so is this library. You are welcomed to try it out, but USE IT AT YOUR OWN RISK.

# Quick start

## 0. Load script/module

#### Browser
```HTML
<script src="https://pifop.com/pifop.js"></script>
```

#### Node.js
```shell
npm install pifop
```

```JS
const pifop = require("pifop");
```

## 1. Execute a PIFOP Function that takes a single input file
```js
pifop.execute("joe/example", "apikey_ABC123", myInput)
  .onFinish((execution, event) => {
      // Display/use the results here
      console.log(execution.result);
  });
```

## 2. Execute a PIFOP Function that takes multiple input files
```js
pifop.execute("joe/example", "apikey_ABC123")
  .setInput("input1", myInput1)
  .setInput("input2", myInput2)
  .onFinish((execution, event) => {
      // Display/use the results here
      console.log(execution.result);
  });
```

## 3. Print terminal output during execution
```js
pifop.execute("joe/example", "apikey_ABC123", myInput)
  .onProgress((execution, event) => {
      // Display execution log
      console.log(event.data.log);
  })
  .onFinish((execution, event) => {
      // Display/use the results here
      console.log(execution.result);
  });
```

## 4. Handle errors
```js
pifop.execute("joe/example", "apikey_ABC123", myInput)
  .onFinish((execution, event) => {
      // Display/use the results here
      console.log(execution.result);
  })
  .onError((execution, event) => {
      // Handle errors here
      console.log(event);
  });
```

# Documentation

- [Introduction](#introduction)
- [`Execution`](#execution)
  - [Constructors](#constructors)
    - [`pifop.execute()`](#pifopexecutefuncuid-apikey-input)
    - [`pifop.resume()`](#pifopresumefuncuid-apikey-execid)
  - [Instance Methods](#instance-methods)
    - [`setInput(), withInput()`](#setinputinputid-content-withinputcontent)
    - [`onStarted(), onProgress(), onFinish(), onError()`](#onstarted-onprogress-onfinish-onerror)
    - [`onEvent()`](#oneventlistener-once)
    - [`setMetadata()`](#setmetadatakey-value)
    - [`ignoreLog()`](#ignorelogboolean)
- [Events](#events)
  - [`Event` Properties](#event-properties)
  - [`Event` Types](#event-types)

## Introduction

This library is a JavaScript client API to the more generic [PIFOP Functions REST API](https://pifop.com/help/functions_rest.html). Internally, it works by queueing "atomic" REST API calls (initialization, start, termination, etc) to perform "molecular" actions, and then it notifies you when it has completed something.

The series of atomic actions that are needed to run an execution from start to finish is automatically queued when you create an `Execution` with `pifop.execute(...)`. All that you have to do is to provide the input files and listen to the events generated during the execution lifetime, as such:

```js
pifop.execute("joe/example", "apikey_ABC123")
  .setInput("inputId", myInput)
  .onProgress((execution, event) => {/* Do something */})
  .onFinish((execution, event) => {/* Do something */})
```

## `Execution`

### Constructors

#### `pifop.execute(funcUID, apiKey, [input])`
Creates and returns a self-managed `Execution` that will automatically initialize itself, upload the provided input, start the execution and terminate it once it has finished. The returned `Execution` is uninitialized, but you don't have to initialize it yourself. Just provide the input and set the event listeners as shown above and you are good to go.

- `funcUID`: a function Universal Identifier (UID). The UID of a function is a `string` with the format `author/id`, where `author` is the author of the function and `id` is the function `id`.
- `apiKey`: an API key for the function `funcUID`.
- `input`: *optional* input content. You can only pass the input content as an argument if the Function being called only accepts one input &mdash; see [`withInput()`](#setinputinputid-content-withinputcontent) to learn more. Otherwise, you must call [`setInput()`](#setinputinputid-content-withinputcontent) to set the input content.

#### `pifop.resume(funcUID, apiKey, execId)`
Resume an Execution previously created with `pifop.execute()`. Only Executions that have already been started can be resumed. Use this constructor as a recovery mechanism in case of a program crash, client disconnection and other kinds of interruption.

- `funcUID`: [see above](#pifopexecutefuncuid-apikey-input).
- `apiKey`: [see above](#pifopexecutefuncuid-apikey-input).
- `execId`: id of the execution to be resumed.

Usage example:
```JS
pifop.execute("joe/example", "apikey_ABC123", input)
  .onStarted((execution) => {
    // Store the id of the execution so that
    // you can  resume it later, if necessary.
  })
  .onEvent(eventHandler);

// After crash or disconnection...

// Resume execution using its id
let execId = getExecutionId(...);
pifop.resume("joe/example", "apikey_ABC123", execId)
  .onEvent(eventHandler);
```


<br>

### Instance Methods

#### `setInput(inputId, content), withInput(content)`
`setInput()` sets the `content` of the input `inputId`. The provided input is not immediatelly uploaded. Rather, it will be uploaded once the `Execution` has been initialized in the server.

`withInput()` is an alternative that you can use if, and only if, the Function being called only accepts a single input file. It behaves exactly like `setInput()`, except that you can ommit the `inputId` in this case.

- `inputId`: the id of the input file to which the `content` belongs.
- `content`: the content of the input file. It can be anything acceptable as a [`fetch body`](https://developer.mozilla.org/en-US/docs/Web/API/fetch), including [`String`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String), [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob), [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer), [`TypedArray`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray) and [`DataView`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView).

#### `onStarted(...), onProgress(...), onFinish(...), onError(...)`
Family of event listener setters for common [events](#events) that you may want to listen to. They all take two arguments: `onXXXX(listener, [once])`.

- `listener`: a function that will be called with arguments `listener(execution, event)`.
  - `execution`: the `Execution` that is related to the event.
  - `event`: an [`Event` object](#event-object) containing all the details pertaining the event.
- `once`: _optional_ boolean. If `true`, the `listener` will be removed from the execution after being called once. Default: `false`.

[Event type](#event-types) associated with each setter:
- `onStarted`: the `listener` will listen to the `"execution_started"` event.
- `onProgress`: the `listener` will listen to `"execution_info"` events.
- `onFinish`: the `listener` will listen to the `"result_ready"` event.
- `onError`: the `listener` will listen to `"error"` events.

#### `onEvent(listener, once)`
Generic [event](#events) listener setter. The `listener` will be called whenever an [event](#events) of any kind happens. Use the [`type`](#event-properties) member of the `event` to distinguish between events.

- `listener`: [see above](#onstarted-onprogress-onfinish-onerror).
- `once`: [see above](#onstarted-onprogress-onfinish-onerror).

Usage example:
```js
pifop.execute("joe/example", "apikey_ABC123", input)
  .onEvent((execution, event) => {
    switch(event.type) {
      case "event_type1": /* Do something */ break;
      case "event_type2": /* Do something */ break;
      // ...
    }
  });
```

#### `setMetadata(key, value)`
User-defined arbitrary data. That's for your convenience only. It allows you to associate some data with an `execution`, which you can then access later, e.g., on event listeners.

- `key`: the `string` that will be used as a key to accessing the `value`.
- `value`: any object whatsoever.

Usage example:
```js
pifop.execute("joe/example", "apikey_ABC123", input)
  .setMetadata("my_data", 48)
  .onFinish((execution) => {
      console.log(execution.metadata["my_data"]); // 48
  });
```

#### `ignoreLog([boolean])`
Call this function without arguments if you don't care for the execution log. The execution log is essentially what the execution prints out to the terminal. When the execution log is ignored, it is **not** periodically retrieved via the `getInfo()` function, meaning that no `log` will be available in the `data` member of the `Event` passed to the `listener` bound by `onProgress()`. The main benefit of this is an improvement on the network performance of your application, as less data will be transfered from PIFOP to your application.

- `boolean`: *optional* boolean indicating if you want to ignore the execution log or not. Default: `true`.

Usage example:

```JS
pifop.execute("joe/example", "apikey_ABC123", input)
  .ignoreLog()
  .onFinish(/* Do something */);
```

## Events

The `listener` arguments in the [`onXXXX()` family of functions](#onstarted-onprogress-onfinish-onerror) are user-defined functions that will be called when certain events happen during the execution. Event listeners are passed two arguments: `listener(object, event)`, where `object` is either an `Execution` or a `Function`, depending on who is listening to that event, and `event` is an `Event` object.

### `Event` Properties:
- `type`: type of the event. [See below](#event-types).
- `operation`: operation that was being perfomed when the event happened.
- `data`: the data related to the event. Each event type will have a different `data`. [See below](#event-types).
- `objectType`: a `string` representing the type of the object related to the `operation` type. Can be `"execution"` or `"function"`.
- `execution`: `Execution` object related to that event.
- `func`: `Function` object related to that event.
- `response`: the [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) that we've got from the server.

### `Event` Types:
| Type | Description |
|---|---|
| `"function_initialized"` | The `func` object has been initialized and is ready to be used. The `data` member contains the function data. `listener` setter: `function.onInit()` |
| `"execution_initialized"` | The `execution` object has been initialized. The `data` member contains the execution data. `listener` setter: `execution.onInit()` |
| `"input_uploaded"` | Input file has been uploaded to `execution`. The `data` member contains the input that has been uploaded. |
| `"execution_started"` | The `execution` has been started. The `data` member contains the execution data. |
| `"execution_info"` | Info about the `execution` has been retrieved. The `data` member contains the execution data. `listener` setter: `execution.onProgress()` |
| `"execution_ended"` | The `execution` has ended. The `data` member contains the execution data. |
| `"result_ready"` | The `execution` has ended and all of its output files have been retrieved. Output files can be found in `execution.output`, or in `execution.result` if only one output file has been generated. If the single output is a JSON, `execution.result` will be the parsed output so you can access its members directly. If the single output is not a JSON, `execution.result` will be an `Output` object. |
| `"output_retrieved"` | An output file of `execution` has been retrieved. The `data` member contains the output that has been retrieved. |
| `"execution_stopped"` | The `execution` has been stopped. The `data` member contains the execution data. |
| `"error"` | Something bad has happened. `listener` setter: `onError()` |

