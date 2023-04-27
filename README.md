# PIFOP Functions JavaScript API

> **Warning**:
> PIFOP Functions is an experimental feature, and so is this library. You are welcomed to try it out, but USE IT AT YOUR OWN RISK.

# Quick start

## 0. Load script/module

#### Browser
```HTML
<script src="https://pifop.com/api/pifop.js"></script>
```

#### Node.js
```
npm install pifop
```

```JS
let pifop = require("pifop");
```

## 1. Execute a PIFOP Function that takes a single input file
```js
pifop.execute("joe/example", "apikey_ABC123", myInput)
  .onFinish((execution) => {
      // Display the results here
      console.log(execution.result);
  });
```

## 2. Execute a PIFOP Function that takes multiple input files
```js
pifop.execute("joe/example", "apikey_ABC123")
  .setInput("input1", myInput1)
  .setInput("input2", myInput2)
  .onFinish((execution) => {
      // Display the results here
      console.log(execution.result);
  });
```

## 3. Print terminal output during execution
```js
pifop.execute("joe/example", "apikey_ABC123", myInput)
  .onProgress((execution, event) => {
      // Display stdout
      console.log(event.data.stdout);
  })
  .onFinish((execution) => {
      // Display the results here
      console.log(execution.result);
  });
```

## 4. Handle errors
```js
pifop.execute("joe/example", "apikey_ABC123", myInput)
  .onFinish((execution) => {
      // Display the results here
      console.log(execution.result);
  })
  .onError((execution, event) => {
      // Handle errors here
      console.log(event);
  });
```

# Documentation

- [Overview](#overview)
- [`Execution`](#execution)
  - [Constructor](#constructor)
    - [`pifop.execute()`](#pifopexecutefuncuid-apikey)
  - [Instance Methods](#instance-methods)
    - [`setInput()`](#setinputinputid-content)
    - [`withInput()`](#withinputcontent)
    - [`onProgress(), onFinish(), onError()`](#onprogresslistener-onfinishlistener-onerrorlistener)
    - [`onEvent()`](#oneventlistener)
    - [`setMetadata()`](#setmetadatakey-value)
- [Events](#events)
  - [`Event` Properties](#event-properties)

## Overview

This library is a JavaScript client API to the more generic PIFOP Functions REST API. Internally, it works by queueing "atomic" REST API calls (initialization, start, termination, etc) to perform "molecular" actions, and then it notifies you when it has completed something.

The series of atomic actions that are needed to run an execution from start to finish is automatically queued when you create an `Execution` with `pifop.execute(...)`. All that you have to do is to provide the input files and listen to the events generated during the execution lifecycle, as such:

```js
pifop.execute("joe/example", "apikey_ABC123") // 1. Initialize execution
  .setInput("input", myInput)                 // 2. Upload input file(s) and start execution
  .onProgress(listener)                       // 3. Get terminal output periodically (optional)
  .onFinish(listener)                         // 4. Download output file(s)
```

## `Execution`

### Constructor

#### `pifop.execute(funcUID, apiKey [, input])`
Creates and returns a self-managed `Execution` that will automatically initialize itself, upload the provided input, start the execution and terminate it once it has finished. The returned `Execution` is uninitialized, but you don't have to initialize it yourself. Just provide the input and set the event listeners as shown above and you are good to go.

- `funcUID`: a function Universal Identifier (UID). The UID of a function is a `string` with the format `author/id`, where `author` is the author of the function and `id` is the function `id`.
- `apiKey`: an API key for the function `funcUID`.
- `input`: optional input content. You can only pass the input content as an argument if the Function being called only accepts one input. This is equivalent to calling `withInput(...)` after creating an `Execution`, e.g.:
    ```JS
    pifop.execute("joe/example", "apikey_ABC123").withInput(input);
    ```

<br>

### Instance Methods

#### `setInput(inputId, content)`
Set the `content` of input `inputId`. The provided input is not immediatelly uploaded. Rather, it will be uploaded once the `Execution` has been initialized in the server.

- `inputId`: the id of the input file to which the `content` belongs.
- `content`: the content of the input file with id `inputId`. Can be anything acceptable as a [`fetch body`](https://developer.mozilla.org/en-US/docs/Web/API/fetch), including `string`, [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob), [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer), [`TypedArray`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray) and [`DataView`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView).

#### `withInput(content)`
Same as `setInput`, but you don't have to provide an `inputId`. This only works for PIFOP functions that take a single file as input.

- `content`: the content of the input file with id `inputId`. Can be anything acceptable as a [`fetch body`](https://developer.mozilla.org/en-US/docs/Web/API/fetch), including `string`, [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob), [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer), [`TypedArray`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray) and [`DataView`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView).

#### `onProgress(listener), onFinish(listener), onError(listener)`
Event listener setter for common [events](#events) that you may want to listen to.

- `listener`: a function that will be called with arguments `listener(execution, event)`.
  - `execution`: the `Execution` that is related to the event.
  - `event`: an [`Event` object](#event-object) containing all the details pertaining the event.

- `onProgress`: the `listener` will listen to `"execution_info"` events.
- `onFinish`: the `listener` will listen to the `"result_ready"` event.
- `onError`: the `listener` will listen to `"error"` events.

#### `onEvent(listener)`

Generic [event](#events) listener setter. This `listener` is called whenever an [event](#events) of any kind happens.

- `listener`: a function that will be called with arguments `listener(execution, event)`.
  - `execution`: the `Execution` that is related to the event.
  - `event`: an `Event` object containing all the details pertaining the event. Read more about `Event` objects below.

#### `setMetadata(key, value)`
User-defined arbitrary data. That's for your convenience only. It allow you to associate some data with an execution and thus be able to access it, for instance, on event listeners, as such: `execution.metadata.myKey`.

- `key`: the `string` that will be used as a key to accessing the `value`.
- `value`: any object whatsoever.

## Events

The `listener` arguments in [`onSomething()` family of functions](#onprogresslistener-onfinishlistener-onerrorlistener) are user-defined functions that will be called when certain events happen during the execution. Event listeners are passed two arguments: `listener(object, event)`, where `object` is either an `Execution` or a `Function`, depending on who is listening to that event, and `event` is an `Event` object.

### `Event` Properties:
- `type`: type of the event.

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

- `operation`: operation that was being perfomed when the event happened.
- `data`: the data related to the event. Each event type will have a different `data`. See [Event Types](#event-types) to learn more.
- `objectType`: a `string` representing the type of the object related to the `operation` type. Can be `"execution"` or `"function"`.
- `execution`: `Execution` object related to that event.
- `func`: `Function` object related to that event.
- `response`: the [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) that we've got from the server.


