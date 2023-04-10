# pifop.js 
PIFOP Functions API Client library for Javascript

> **Warning**:
> PIFOP FUNCTIONS IS AN EXPERIMENTAL UNDER-DEVELOPMENT FEATURE. USE IT AT YOUR OWN RISK.

## Quick start

### Load script
```HTML
<script src="https://pifop.com/api/pifop.js"></script>
```

### 1. Execute a PIFOP Function that takes a single input file
```js
pifop.execute("joe/example", "apikey_ABC123")
  .withInput(myInput)
  .onFinish((execution) => {
      // Display the results here
      console.log(execution.result);
  });
```

### 2. Execute a PIFOP Function that takes multiple input files
```js
pifop.execute("joe/example", "apikey_ABC123")
  .setInput("input1", myInput1)
  .setInput("input2", myInput2)
  .onFinish((execution) => {
      // Display the results here
      console.log(execution.result);
  });
```

### 3. Print terminal output during execution
```js
pifop.execute("joe/example", "apikey_ABC123")
  .withInput(myInput)
  .onProgress((execution, event) => {
      // Display stdout
      console.log(event.data.stdout);
  })
  .onFinish((execution) => {
      // Display the results here
      console.log(execution.result);
  });
```

### 4. Handle errors
```js
pifop.execute("joe/example", "apikey_ABC123")
  .withInput(myInput)
  .onFinish((execution) => {
      // Display the results here
      console.log(execution.result);
  })
  .onError((execution, event) => {
      // Handle errors here
      console.log(event);
  })
```

# Documentation
## Overview

This library defines two types of objects:
- `Function`: represent a PIFOP function. Create a `Function` object with `pifop.initFunction(...)`:
```js
let func = pifop.initFunction("joe/example", "apikey_ABC123");
```
- `Execution`: represent a function execution. Create an `Execution` object with `pifop.execute(...)`:
```js
let execution = pifop.execute("joe/example", "apikey_ABC123");
```

Although every `Execution` depends on a `Function`, most of the time you will not be interacting with `Function` objects directly.

## `Execution` overview

Conceptually speaking, these are the operations that need to be performed in order to execute a PIFOP function:
1. Initialize execution
2. Upload input file(s)
3. Start execution
4. Get terminal output
5. Download output file(s)

These can be acomplished with 4 lines of code:
```js
pifop.execute("joe/example", "apikey_ABC123") // 1. Initialize execution
  .setInput("input", myInput)                 // 2 and 3. Upload input files and start execution
  .onProgress(listener)                       // 4. Get terminal output
  .onFinish(listener)                         // 5. Download output file(s)
```

## Event listeners

The `listener` parameters in the above snippet are the functions that will be called when a certain event happens. The `listener` set with `onProgress`  is called after each execution information polling, and `listener` set with `onFinish` is called after the execution is over and the output files have been retrieved.

Two parameters are passed to the event listeners: `execution` and `event`. E.g.:
```js
pifop.execute("joe/example", "apikey_ABC123")
  .setInput("input", myInput)
  .onFinish((execution, event) => {
      console.log(execution, event);
  });
```

You can also add an error `listener` with `onError`, and, more generally, you can add a `listener` for every event with `onEvent`, which give you the option to handle every type of event in a single function.

## `Execution` Basic API

#### `pifop.execute(funcUID, apiKey)`
Creates and returns a self-managed `Execution` that will automatically initialize itself, upload the provided input, start the execution and terminate it once it has finished. The returned `Execution` is uninitialized, but you don't have to initialize it yourself. Just provide the input and set the event listeners as shown above and you are good to go.

- `funcUID`: a function Universal Identifier (UID). The UID of a function is a `string` with the format `author/id`, where `author` is the author of the function and `id` is the function `id`.
- `apiKey`: an API key for the function `funcUID`.

---

#### `setInput(inputId, content)`
Set the `content` of input `inputId`. The provided input is not immediatelly uploaded. Rather, it will be uploaded once the `Execution` has been initialized in the server.

- `inputId`: the id of the input file to which the `content` belongs.
- `content`: the content of the input file with id `inputId`.

---

#### `withInput(content)`
Same as `setInput`, but you don't have to provide an `inputId`. This only works for PIFOP functions that take a single file as input.

- `content`: the content of the input file.

---

#### `onProgress(listener), onFinish(listener), onError(listener), onEvent(listener)`
Event listener setter for common events that you may want to listen to.

- `listener`: a function that will be called with arguments `listener(execution, event)`.
  - `execution`: the `Execution` that is related to the event.
  - `event`: an `Event` object containing all the details pertaining the event. Read more about `Event` objects below.

---

#### `setMetadata(key, value)`
User-defined arbitrary data. That's for your convenience, so that you can associate some data with an execution and thus be able to access it, for instance, on event listeners, as such: `execution.metadata.myKey`.

- `key`: the `string` that will be used as a key to accessing the `value`.
- `value`: any object whatsoever.

## `Event` Object

Use the *onSomething(...)* family of event `listener` setters of `Execution` and `Function` to add listeners for common events. Event listeners are passed two arguments: `listener(object, event)`, where `object` is either an `Execution` or a `Function`, depending on who is listening to that event, and `event` is an `Event` object.

The members of the `Event` object vary accross event types, but in general, every `Event` has the following members:
- `type`: type of the event.
- `operation`: operation that was being perfomed when the event happened.
- `data`: the data related to the event. Each event type will have a different `data`. See [Event Types](#event-types) to learn more.
- `objectType`: a `string` representing the type of the object related to the `operation` type. Can be `"execution"` or `"function"`.
- `execution`: `Execution` object related to that event.
- `func`: `Function` object related to that event.
- `response`: the `Response` that we've got from the server.

### `Event` Types

#### `"function_initialized"`
The `func` object has been initialized and is ready to be used. The `data` member contains the function data. `listener` setter: `function.onInit()`

---

#### `"execution_initialized"`
The `execution` object has been initialized. The `data` member contains the execution data. `listener` setter: `execution.onInit()`

---

#### `"input_uploaded"`
Input file has been uploaded to `execution`. The `data` member contains the input that has been uploaded.

---

#### `"execution_started"`
The `execution` has been started. The `data` member contains the execution data.

---

#### `"execution_info"`
Info about the `execution` has been retrieved. The `data` member contains the execution data. `listener` setter: `execution.onProgress()`

---

#### `"execution_ended"`
The `execution` has ended. The `data` member contains the execution data.

---

#### `"result_ready"`
The `execution` has ended and all of its output files have been retrieved. Output files can be found in `execution.output`, or in `execution.result` if only one output file has been generated. If the single output is a JSON, `execution.result` will be the parsed output so you can access its members directly. If the single output is not a JSON, `execution.result` will be an `Output` object.

---

#### `"output_retrieved"`
An output file of `execution` has been retrieved. The `data` member contains the output that has been retrieved.

---

#### `"execution_stopped"`
The `execution` has been stopped. The `data` member contains the execution data.


