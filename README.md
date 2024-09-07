Fetch Helper
==========

[![CI](https://github.com/magiclen/ts-fetch-helper/actions/workflows/ci.yml/badge.svg)](https://github.com/magiclen/ts-fetch-helper/actions/workflows/ci.yml)

This package provides some useful utilities and functions for using the Fetch API.

## Usage

```typescript
import { timeoutFetch } from "fetch-helper-x";

const response = await timeoutFetch("https://google.com", { requestTimeout: 10000, idleTimeout: 1000 });

console.log(await response.text());
// if you want to cancel the body, use `await response.cancelBody()` instead; otherwise, the program will hang because the connection and timer are still active
```

## Usage for Browsers

[Source](demo.html)

[Demo Page](https://rawcdn.githack.com/magiclen/ts-fetch-helper/master/demo.html)

## License

[MIT](LICENSE)