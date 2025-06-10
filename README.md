<h1 align="center">
  SmartCharts
</h1>

## In this document:

-   [Pre-installation](#pre-installation)
-   [Quick start](#quick-start)
-   [Usage](#Usage)
-   [How to contribute](#how-to-contribute)
-   [Manage translations](#manage-translations)
-   [Manage releases](#manage-releases)
-   [FAQ](#faq)

## Pre-installation

Before running or contribute to this project, you need to have the setup of the following packages in your environment:

-   node
-   npm
-   git (for `contribution`)

## Quick start

1.  **Fork the project**

    In order to work on your own version of the Deriv application, please fork the project to your own repo.

2.  **Clone using SSH**

    ```sh
    git@github.com:deriv-com/smartcharts-champion.git
    ```

3.  **Enter project directory**

In the `app` folder, we provide a working webpack project that uses the smartcharts library. Simply `cd` to that directory.

4.  **Install your dependencies:**

    ```sh
    npm install
    ```

5.  **To start developing:**

    ```sh
    npm start
    ```

6.  **Open the source code and start editing!**

    The sample app should be running in `http://localhost:8080`.

### Other useful commands:

- use `npm install` to install dependencies
- use `npm start` to launch webpack dev server
- use `npm run build` to build the library
- use `npm run build:app` to build the app
- use `npm run analyze` to run webpack-bundle-analyzer
- use `npm run test` to run unit tests
- use `npm run coverage` to see test coverage

> Note: eventhough both `npm run build` and `npm run build:app` outputs `smartcharts.js` and `smartcharts.css`, **they are not the same files**. One outputs a library and the the other outputs an app.

## Usage

You can install the library using one of the following commands:

Using npm:

```bash
$ npm install @deriv-com/smartcharts-champion
```

Using yarn:

```bash
$ yarn add @deriv-com/smartcharts-champion
```


You can refer to library usage inside `app/index.tsx`:

```jsx
import { SmartChart } from '@deriv-com/smartcharts-champion';

class App extends React.Component {
    render() {
        return (
            <SmartChart
                // For handling history data
                getQuotes={({ symbol, granularity, count, start, end, style }) => Promise}
                // For subscribing to real-time quotes
                subscribeQuotes={({ symbol, granularity }, callback) => unsubscribeFunction}
                // For forgetting subscriptions
                unsubscribeQuotes={(request) => {}}
                // Optional: Pass chart data for updates
                chartData={{
                    tradingTimes: {...},
                    activeSymbols: [...]
                }}
                // Control whether to fetch data from API
                feedCall={{ activeSymbols: false, tradingTimes: false }}
            />
        );
    }
};
```

SmartCharts expects library user to provide `getQuotes`, `subscribeQuotes` and `unsubscribeQuotes`. Refer to [API](#api) for more details.

The job of loading the active symbols or trading times or stream data from cache or retrieving from websocket is therefore NOT the responsibility of SmartCharts but the host application. SmartCharts simply makes the requests and expect a response in return.

Some important notes on your webpack.config.js (refer to `app/webpack.config.js`):

- smartcharts CSS file will need to be copied from the npm library (remember to include in your `index.html`).
- smartcharts consist of a few chunks (which has filenames `*.smartcharts.*`), which it downloads asynchronously during runtime. Therefore, it needs to know where the library user places its chunks via the `setSmartChartsPublicPath` function:

```js
import { setSmartChartsPublicPath } from "@deriv-com/smartcharts-champion";

// SmartCharts chunk are deployed to https://mysite.com/dist/*
setSmartChartsPublicPath("/dist/");
```

We can use the `copy-webpack-plugin` webpack plugin to copy over SmartCharts chunks:

```js
new CopyWebpackPlugin([
  { from: "./node_modules/@deriv-com/smartcharts-champion/dist/*.smartcharts.*" },
  { from: "./node_modules/@deriv-com/smartcharts-champion/dist/smartcharts.css" },
]);
```
### API

> Note: Props will take precedence over values set by the library.

Props marked with `*` are **mandatory**:

| Props                     | Description                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| getQuotes\*         | Function to fetch historical tick data. Expects parameters `{ symbol, granularity, count, start?, end?, style? }` and returns a Promise with candles or history data.                                                                                                                                                                                            |
| subscribeQuotes\*               | Function to subscribe to real-time quotes. Expects parameters `({ symbol, granularity }, callback)` and returns an unsubscribe function.                                                                                                                                                                                                                         |
| unsubscribeQuotes\*           | When SmartCharts no longer needs a subscription, it will call this method (passing in the request object) to halt the subscription.                                                                                                                                                                                                                              |
| id                        | Uniquely identifies a chart's indicators, symbol and layout; saving them to local storage and loading them when page refresh. If not set, SmartCharts renders a fresh chart with default values on each refresh. Defaults to `undefined`.                                                                                                           |
| getMarketsOrder           | Callback function to set/order the active symbols category. `active_symbols` is passed to the callback and an array of markets is expected in return. Allowed values are `forex`, `basket_index`, `indices`, `stocks`, `commodities`, `synthetic_index` and `cryptocurrency`. Defaults to `undefined`                                                                                                 |
| getIndicatorHeightRatio           | Callback function to set/order the height of the active indicators that attach to the bottom of the chart. The chart pass two parameters, `chart_height` and `indicator_count` and the callback should return an object that contains two parameters, `height` and `percent` which `height` present the height of each indicator in pixel and the `percent` present the percentage of height compare to chart height. Example:  `getIndicatorHeightRatio: (chart_height, indicator_count) => ({height, percent})` . Defaults to `undefined`                                                                                       |
| symbol                    | Sets the main chart symbol. Defaults to `R_100`. Refer [Props vs UI](#props-vs-ui) for usage details.                                                                                                                                                                                                                                                            |                                                                                                                                                                                                                                                  |
| chartData                 | Pass chart data for updates. Default is `undefined`.                                                                                                                                                                                                                         |
| feedCall                  | Enable/Disable the feed call for getting requirement resources. Default is `{activeSymbols: true,tradingTimes: true}`                                                                                                                                                                                                                                             |
| granularity               | Sets the granularity of the chart. Allowed values are 60, 120, 180, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 86400. Defaults to 0. Refer [Props vs UI](#props-vs-ui) for usage details.                                                                                                                                                                    |
| chartType                 | Sets the chartType. Choose between `mountain` (Line), `line` (Dot), `colored_line` (Colored Dot), `spline`, `baseline`, `candle`, `colored_bar` (OHLC), `hollow_candle`, `heikinashi`, `kagi`, `linebreak`, `renko`, `rangebars`, and `pandf` (Point & Figure). Defaults to `mountain`. Refer [Props vs UI](#props-vs-ui) for usage details.                     |
| contractInfo                 | An object of `ProposalOpenContract` type. Includes data of a contract for which ticks are currently being drawn. Includes such data as `tick_stream` array, `tick_count` number, `underlying` string, etc. Required for `shouldDrawTicksFromContractInfo` prop to work. Defaults to an `{}` empty object.                   |
| startEpoch                | Set the start epoch of the chart                                                                                                                                                                                                                                                                                                                                 |
| endEpoch                  | Set the end epoch of the chart                                                                                                                                                                                                                                                                                                                                   |
| chartControlsWidgets      | Render function for chart control widgets. Set to `null` if you want to hide chart controls. Refer to [Customising Components](#customising-components).                                                                                                                                                                                                         |
| topWidgets                | Render function for top widgets. Refer to [Customising Components](#customising-components).                                                                                                                                                                                                                                                                     |
| bottomWidgets             | Render function for bottom widgets. Refer to [Customising Components](#customising-components).                                                                                                                                                                                                                                                                  |
| toolbarWidget             | Render function for floating toolbar widgets. Refer to [Customising Components](#customising-components).                                                                                                                                                                                                                                                        |
| isMobile                  | Switch between mobile or desktop view. Defaults to `false`.                                                                                                                                                                                                                                                                                                      |
| onSettingsChange          | Callback that will be fired each time a setting is changed.                                                                                                                                                                                                                                                                                                      |
| stateChangeListener       | Callback that will be fired on chart state change, It will return two parameters `(state, option)`. An state, and an option that is related to desire state. Chart has three states that are: `INITIAL` , `READY` and `SCROLL_TO_LEFT`.                                                                                                                          |
| settings                  | Sets the chart settings. Refer to [Chart Settings](#chart-settings)                                                                                                                                                                                                                                                                                              |
| barriers                  | Draw chart barriers. Refer to [Barriers API](#barriers-api) for usage details                                                                                                                                                                                                                                                                                    |
| enableRouting             | Enable routing for dialogs. Defaults to `false`                                                                                                                                                                                                                                                                                                                  |
| isConnectionOpened        | Sets the connection status. If set, upon reconnection smartcharts will either patch missing tick data or refresh the chart, depending on granularity; if not set, it is assumed that connection is always opened. Defaults to `undefined`.                                                                                                                       |
| onMessage                 | SmartCharts will send notifications via this callback, should it be provided. Each notification will have the following structure: `{ text, type, category }`.                                                                                                                                                                                                   |
| isAnimationEnabled        | Determine whether chart animation is enabled or disabled. It may needs to be disabled for better performance. Defaults to `true`.                                                                                                                                                                                                                                |
| isVerticalScrollEnabled   | Determine whether verticall scroll on the chart outside Y-axis is disabled while it is forced on the nearest scrollable parent instead. It may need to be disabled for mobile app version to scroll the page up or down instead of the chart. In this case, when scroll delta exceeds 10px, the page will be force-scrolled fully in a respective direction. Defaults to `true`.                                                                                                                                                                                                                                |
| showLastDigitStats        | Shows last digits stats. Defaults to `false`.                                                                                                                                                                                                                                                                                                                    |
| scrollToEpoch             | Scrolls the chart to the leftmost side and sets the last spot/bar as the first visible spot/bar in the chart. Also, it disables scrolling until the chart reaches the 3/4 of the width of the main pane of the chart. Defaults to `null`.                                                                                                                        |
| clearChart                | Clear the chart.                                                                                                                                                                                                                                                                                                                                                 |
| onExportLayout            | Export the layout and send it back using this callback.                                                                                                                                                                                                                                                                                                          |
| importedLayout            | The layout to be imported to chart. It should be the layout that was exported in onExportLayout;                                                                                                                                                                                                                                                                 |
| shouldDrawTicksFromContractInfo         | Determine whether SmartCharts should draw ticks on the chart based on `contractInfo` object, which contains data from `proposal_open_contract` API response, instead of ticks from `ticks_history` API response. Should be used together with `contractInfo` prop described above, otherwise `ticks_history` API response will be used for drawing ticks as usual. Defaults to `false`.                                                                                                                                                                                                                                                   |
| shouldFetchTradingTimes   | Determine whether an API call for fetching trading times is necessary for the new chart or not. Defaults to `true`                                                                                                                                                                                                                                                   |
| should_zoom_out_on_yaxis  | Forces y-axis to zoom out. Overrides `top` and `bottom` values of `yAxisMargin` prop. Defaults to `undefined`.                                                                                                                                                                                                                                                   |
| shouldFetchGetQuotes    | Determine whether an API call for fetching tick history is necessary for the new chart or not. Defaults to `true`                                                                                                                                                                                                                                                   |
| allTicks                  | Provides all_ticks contract data for chart rendering when contract with duration = 'ticks' . Defaults to `undefined`                                                                                                                                                                                                                                              |
| maxTick                   | Set the max number of first points/candles in the visible chart area. The value should be number greater than zero. Defaults to `undefined`                                                                                                                                                                                                                      |
| crosshair                 | Set state of Crosshair Component. Allowed values are undefined, 0,1,2. Defaults to `undefined`                                                                                                                                                                                                                                                                   |
| crosshairTooltipLeftAllow | Set max left position which chart allow to render left side tooltip of crosshair, if mouse position before this size, the crosshair tooltip move to right side of mouse, if set `null` then chart specify `315px` as default value. Defaults to `null`                                                                                                           |
| zoom                      | Zoom in and Zoom out the chart. the value should be `1` or `-1`. If the value is `1` the chart will be zoomed in, and if the value is `-1` it zoomed out.                                                                                                                                                                                                        |
| yAxisMargin               | Set the margins of chart yAxis. It's an object that takes two parameters, `bottom` for margin bottom of chart, and `top` for the top margin of chart.                                                                                                                                                                                                            |
| enableScroll              | Enable/disable scroll feature in chart. Scroll gets disable on chart scale `1:1` and enable whenever user zoom in/out. This property override that feature . Defaults to `true`                                                                                                                                                                                  |
| enableZoom                | Enable/disable zoom feature in chart. Defaults to `true`                                                                                                                        
### Chart Settings

| Attribute                    | Description                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| countdown                    | Show Countdown. Defaults to `false`.                                                                                                  |
| theme                        | Sets the chart theme. themes are (`dark\|light`), and default is `light`.                                                             |
| lang                         | Sets the language. Defaults to `en`.                                                                                                  |
| minimumLeftBars              | The default number of bars to display on the chart. It's used in combination with `whitespace` setting in order to adjust white space width. Please refer to `whitespace` below for more details. Defaults to `undefined`.                                                                                                  |
| position                     | Sets the position of the chart controls. Choose between `left` and `bottom`. In mobile this is always `bottom`. Defaults to `bottom`. |
| enabledNavigationWidget      | Show or hide navigation widget. Defaults to `false`                                                                                   |
| isHighestLowestMarkerEnabled | Show or hide the highest and lowest tick on the chart. Defaults to `false`.                                                           |
| whitespace                    | The default width of whitespace between the right edge of the chart and the y-axis. It should be used in combination with `minimumLeftBars` setting value. For more details, please refer to stxx.preferences.whitespace in CIQ documentation. Defaults to `undefined`.                                                                                                  |

| Attribute | Description | Sample Data |
| --- | --- | --- |
| activeSymbols | An array of active symbols (available markets) is used to load the market selector. Default is `null`. This value would update in the chart is user toggle property of `refreshActiveSymbols` that cause the chart to request for activeSymbols on the Feed | `[{ allow_forward_starting: 0, display_name: 'AUD Basket', exchange_is_open: 1, is_trading_suspended: 0, market: 'basket_index', market_display_name: 'Basket Indices', pip: 0.001, submarket: 'forex_basket', submarket_display_name: 'Forex Basket', symbol: 'WLDAUD', symbol_type: 'forex_basket' }, ...]`
|tradingTimes | An array of markets trading time is used to determine close/open markets. Default is `null`. The chart will request new data via Feed in a sequence that is calculated regards markets trading time. | `{trading_times: {markets: [{ name: 'Forex', submarkets: [{ name: 'Major Pairs', symbols: [{name: 'AUD/JPY', symbol: 'frxAUDJPY', times: { close: ['23:59:59'], open: ['00:00:00'], settlement: '23:59:59' }, trading_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],events: [{ dates: 'Fridays', descrip: 'Closes early (at 20:55)' },{ dates: '2020-12-25', descrip: 'Christmas Day' },{ dates: '2021-01-01', descrip: "New Year's Day" }], ...}, ]},...]...],}}`
| masterData | An array of ticks that are used to load the graph (candles). Default is `null`. If the Feed is available, the chart will call `fetchInitialData` via Feed to get the initial ticks, for old data it calls `fetchPaginationData` and receives new ticks constantly. If this property is filled, chart user `symbol` property and `setting` property (to extract chart type and interval) and the masterData to load the graph. **Notice:** chart interval in the setting property should be the same as masterData epoch/Date property. If the symbol property does not fill, the chart uses the `symbol` property that exists in the localStorage with the key of `layout-*`, and if that property also does not fill, the chart throws a console error. **(if the desired symbol does not fill in the `symbol` property or `layout-*` localStorage, it caused the chart to just load the given masterData and does not call for the `fetchInitialData` API)**. | `[{"Date":"2020-11-16T04:28:00", "Close":8287.85}, {"Date":"2020-11-16T04:26:00", "Open":8283.25,"High":8293.750015,"Low":8278.75,"Close":8293.75},...]`

#### Barriers API

`barriers` props accepts an array of barrier configurations:

```jsx
<SmartChart
  barriers={[
    {
      color: "green",
      shade: "above",
      hidePriceLines: false, // default false
      onChange: console.warn.bind(console),
    },
  ]}
/>
```

Attributes marked with `*` are **mandatory**:

| Attribute            | Description                                                                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shadeColor           | Barrier shade color. Defaults to `green`.                                                                                                                                          |
| color                | Price line color. Defaults to `#000`.                                                                                                                                              |
| shade                | Shade type; choose between `NONE_SINGLE`, `NONE_DOUBLE`, `ABOVE`, `BELOW`, `OUTSIDE` or `BETWEEN`. Defaults to `NONE_SINGLE`.                                                      |
| hideBarrierLine      | hide/show the barrier line. Can be used to show only the title. Defaults to `false`.                                                                                               |
| hideOffscreenLine    | hide/show the barrier line when it is offscreen. Defaults to `false`.                                                                                                              |
| hideOffscreenBarrier | hide/show the barrier line & title when it is offscreen. Defaults to `false`.                                                                                                      |
| hidePriceLines       | hide/show the price lines. Defaults to `false`.                                                                                                                                    |
| lineStyle            | Sets the style of the price lines; choose between `dotted`, `dashed`, or `solid`. Defaults to `dashed`.                                                                            |
| onChange             | When price of high or low barrier changes (including when switched toggling `relative` or setting `high\|low`), `onChange` will pass the high and low barriers as `{ high, low }`. |
| relative             | Toggle between relative and absolute barriers. Defaults to `false`.                                                                                                                |
| draggable            | Toggles whether users can drag the price lines and change the barrier directly from the chart. Defaults to `true`.                                                                 |
| title                | Title text of the barrier                                                                                                                                                          |
| isSingleBarrier      | Shows only High barrier, stops low barrier & shades from rendering when the flag is true. Defaults to `false`.                                                                     |
| showOffscreenArrows  | hide/show arrows with direction when the barrier is offscreen. Defaults to `false`.                                                                                                |
| opacityOnOverlap     | Sets the opacity of the barrier when it is overlapping with other barrier.                                                                                                         |
| high\*               | Sets the price of the high barrier.                                                                                                                                                |
| low\*                | Sets the price of the low barrier.                                                                                                                                                 |

### Handling Type Errors in StreamManager.ts

When working with the StreamManager.ts file, you might encounter TypeScript errors due to type assertions or complex type relationships. Here are several ways to handle these type errors:

1. **Using `// @ts-ignore` comment**:
   - Place this comment directly above the line with the type error
   - This tells TypeScript to ignore any errors on the next line
   ```typescript
   // @ts-ignore
   this._connection.send((request as unknown) as TBinaryAPIRequest);
   ```

2. **Using `// @ts-nocheck` comment**:
   - Place this at the top of the file to ignore all type errors in the entire file
   - Use this sparingly as it disables type checking for the whole file
   ```typescript
   // @ts-nocheck
   import { ... } from '...';
   ```

3. **Using type assertions**:
   - Already used in the file with `as unknown as Type`
   - This is a two-step assertion that first converts to `unknown` and then to the desired type
   ```typescript
   (data.echo_req as unknown) as TGetQuotes
   ```

4. **Using the `any` type**:
   - The nuclear option that bypasses type checking completely
   - Use with caution as it removes all type safety
   ```typescript
   const response: any = await this._connection.send(request);
   ```

Choose the approach that best fits your specific situation, but try to minimize the use of type bypassing to maintain type safety where possible.

### Example Usage with Dummy Values

Here's an example of how to use the SmartCharts component with dummy values:

```jsx
import React from 'react';
import { SmartChart } from '@deriv-com/smartcharts-champion';

// Sample active symbols data
const dummyActiveSymbols = [
  {
    allow_forward_starting: 0,
    display_name: 'AUD/JPY',
    exchange_is_open: 1,
    is_trading_suspended: 0,
    market: 'forex',
    market_display_name: 'Forex',
    pip: 0.001,
    submarket: 'major_pairs',
    submarket_display_name: 'Major Pairs',
    symbol: 'frxAUDJPY',
    symbol_type: 'forex'
  },
  // Add more symbols as needed
];

// Sample trading times data
const dummyTradingTimes = {
  'frxAUDJPY': {
    isOpen: true,
    openTime: '2023-01-01T00:00:00Z',
    closeTime: '2023-01-01T23:59:59Z'
  },
  // Add more trading times as needed
};

// Sample historical data
const dummyMasterData = [
  {
    Date: '2023-01-01T00:00:00',
    Open: 95.25,
    High: 95.50,
    Low: 95.00,
    Close: 95.35
  },
  {
    Date: '2023-01-01T01:00:00',
    Open: 95.35,
    High: 95.75,
    Low: 95.20,
    Close: 95.60
  },
  // Add more candles as needed
];

const ChartExample = () => {
  // Function to fetch historical tick data
  const getQuotes = ({ symbol, granularity, count, start, end, style }) => {
    console.log('Fetching tick history for:', { symbol, granularity, count, start, end, style });
    
    // Return a promise that resolves with candles or history data
    if (style === 'ticks') {
      // For tick style, return history with times and prices
      return Promise.resolve({
        history: {
          times: dummyMasterData.map(candle => new Date(candle.Date).getTime() / 1000),
          prices: dummyMasterData.map(candle => candle.Close)
        }
      });
    } else {
      // For candle style, return candles
      return Promise.resolve({
        candles: dummyMasterData.map(candle => ({
          open: candle.Open,
          high: candle.High,
          low: candle.Low,
          close: candle.Close,
          epoch: new Date(candle.Date).getTime() / 1000
        }))
      });
    }
  };

  // Function to subscribe to real-time quotes
  const subscribeQuotes = ({ symbol, granularity }, callback) => {
    console.log('Subscribing to quotes for:', { symbol, granularity });
    
    // Simulate real-time updates with an interval
    const interval = setInterval(() => {
      const lastPrice = 95 + Math.random();
      const quote = {
        Date: new Date().toISOString(),
        Close: lastPrice,
        DT: new Date(),
        tick: {
          quote: lastPrice,
          epoch: Math.floor(Date.now() / 1000)
        }
      };
      
      callback(quote);
    }, 1000);
    
    // Return an unsubscribe function
    return () => {
      console.log('Unsubscribing from quotes for:', { symbol, granularity });
      clearInterval(interval);
    };
  };

  // Function to forget subscriptions
  const unsubscribeQuotes = (request) => {
    console.log('Forgetting subscription for:', request);
    // In a real implementation, you would handle unsubscribing from the WebSocket here
  };

  // Function to calculate indicator height ratio
  const getIndicatorHeightRatio = (chart_height, indicator_count) => {
    const isSmallScreen = chart_height < 780;
    const denominator = indicator_count >= 5 ? indicator_count : indicator_count + 1;
    const reservedHeight = 320;
    const indicatorsHeight = Math.round(
      (chart_height - (reservedHeight + (isSmallScreen ? 20 : 0))) / denominator
    );
    
    return {
      height: indicatorsHeight,
      percent: indicatorsHeight / chart_height,
    };
  };

  return (
    <SmartChart
      id="example-chart"
      symbol="frxAUDJPY"
      getQuotes={getQuotes}
      subscribeQuotes={subscribeQuotes}
      unsubscribeQuotes={unsubscribeQuotes}
      chartType="candle"
      granularity={60} // 1-minute candles
      getIndicatorHeightRatio={getIndicatorHeightRatio}
      feedCall={{ activeSymbols: false, tradingTimes: false }}
      isAnimationEnabled={true}
      enabledNavigationWidget={true}
      isLive={true}
    />
  );
};

export default ChartExample;
```

In this example:

1. We define dummy data for active symbols, trading times, and historical candles.
2. We implement the required functions:
   - `getQuotes`: Returns historical data for the chart
   - `subscribeQuotes`: Subscribes to real-time quotes and returns an unsubscribe function
   - `unsubscribeQuotes`: Handles unsubscribing from data streams
   - `getIndicatorHeightRatio`: Calculates the height for indicators
3. We configure the SmartChart component with various props:
   - `id`: A unique identifier for the chart
   - `symbol`: The trading symbol to display
   - `chartType`: Set to "candle" for candlestick chart
   - `granularity`: Set to 60 for 1-minute candles
   - Other configuration options for appearance and behavior

This example demonstrates how to set up a SmartCharts component with dummy data for development or testing purposes.

#### Marker API

Use `FastMarker` to render given components inside the chart.
Markers provide a way for developers to place DOM elements that are positioned based on date, values or tick location inside the chart. Also, please note that this `FastMarker` implementation does not factor the width and height of the marker: this is expensive to calculate, so we expect you to offset this in CSS.
`FastMarker` will keep the marker position on the chart.
It can be imported from `@deriv-com/smartcharts-champion` package either as `FastMarker`, or simply as `Marker`.

```jsx
<SmartChart>
  <FastMarker
    markerRef={setRef}
    className="your-css-class"
