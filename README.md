# pifop.js 
PIFOP Functions API Client library for Javascript

| PIFOP FUNCTIONS IS AN EXPERIMENTAL UNDER-DEVELOPMENT FEATURE. USE IT AT YOUR OWN RISK. |
|---|

## Quick start

### Setup: load script
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
Creates a self-managed `Execution` that will automatically initialize itself, upload the provided input, start the execution and terminate it once it has finished. The returned `Execution` is uninitialized, but you don't have to initialize it yourself. Just provide the input and set the event listeners as shown above and you are good to go.

---

#### `setInput(inputId, content)`
Set the `content` of input `inputId`. The provided input is not immediatelly uploaded. Rather, it will be uploaded once the `Execution` has been initialized in the server.

---

#### `withInput(content)`
Same as `setInput`, but you don't have to provide an `inputId`. This only works for PIFOP functions that take a single file as input.

---

#### `onProgress(listener), onFinish(listener), onError(listener), onEvent(listener)`
Event listener setter for common events that you may want to listen to. `listener`s are passed the arguments `execution` and `event`.

| Setter | `addEventListener` equivalent |
|---|---|
| `onProgress` | `addEventListener("execution_info", listener)` |
| `onFinish` | `addEventListener("execution_terminated", listener)` |
| `onError` | `addEventListener("error", listener)` |
| `onEvent` | `addEventListener("any", listener)` |

---

#### `setMetadata(key, value)`
User-defined arbitrary data. That's for your convenience, so that you can associate some data with an execution and thus be able to access it, for instance, on event listeners, as such: `execution.metadata.myKey`.

## `Execution` Advanced API

The above basic functions are built on top of the advanced functions shown bellow. Unless you know what you are doing, you should stick to the basic API presented above.

#### `initialize()`
Sends request to initialize execution.
Equivalent HTTP request: `POST func.pifop.com/:func_author/:func_id`

---

#### `uploadInput(inputId, content)`
Upload input `inputId`.
Equivalent HTTP request: `POST func.pifop.com/:func_author/:func_id/executions/:exec_id/input/:input_id`

---

#### `start()`
Sends request to start the execution.
Equivalent HTTP request: `POST func.pifop.com/:func_author/:func_id/executions/:exec_id/start`

---

#### `getInfo()`
Sends request to retrieve execution information, optionally including the terminal output.
Equivalent HTTP request: `GET func.pifop.com/:func_author/:func_id/executions/:exec_id?stdout=...`

---

#### `downloadOutput(outputId)`
Downloads output `outputId`.
Equivalent HTTP request: `GET func.pifop.com/:func_author/:func_id/executions/:exec_id/output/:output_id`

---

#### `stop()`
Sends request to stop the execution.
Equivalent HTTP request: `POST func.pifop.com/:func_author/:func_id/executions/:exec_id/stop`

---

#### `terminate()`
Sends request to terminate the execution.
Equivalent HTTP request: `DELETE func.pifop.com/:func_author/:func_id/executions/:exec_id`

---

#### `addEventListener(type, listener)`
General event listener setter. List of events:
| Event type | Meaning |
|---|---|
| `"function_initialized"` | We've completed the initialization of the function being called. |
| `"execution_initialized"` | We've receive the confirmation that the execution has been initialized on the optimization server. |

