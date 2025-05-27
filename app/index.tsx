import {
    ChartMode,
    ChartSetting,
    ChartTitle,
    createObjectFromLocalStorage,
    DrawTools,
    LogActions,
    LogCategories,
    logEvent,
    Marker,
    setSmartChartsPublicPath,
    Share,
    SmartChart,
    StudyLegend,
    ToolbarWidget,
    Views,
} from '@deriv-com/smartcharts'; // eslint-disable-line import/no-unresolved
import whyDidYouRender from '@welldone-software/why-did-you-render';
import { configure } from 'mobx';
import moment from 'moment';
import React from 'react';
import ReactDOM from 'react-dom';
import { TNotification } from 'src/store/Notifier';
import { TGranularity, TNetworkConfig, TQuote, TRefData, TStateChangeListener } from 'src/types';
import { AuditDetailsForExpiredContract, ProposalOpenContract, TradingTimesResponse } from 'src/types/api-types';
import 'url-search-params-polyfill';
import './app.scss';
import ChartHistory from './ChartHistory';
import ChartNotifier from './ChartNotifier';
import { ConnectionManager, StreamManager } from './connection';
import NetworkMonitor from './connection/NetworkMonitor';
import Notification from './Notification';

setSmartChartsPublicPath('./dist/');
const isMobile = window.navigator.userAgent.toLowerCase().includes('mobi');
if (process.env.NODE_ENV !== 'production') {
    whyDidYouRender(React, {
        collapseGroups: true,
        include: [/.*/],
        exclude: [/^RenderInsideChart$/, /^inject-/],
    });
}
const trackJSDomains = ['binary.com', 'binary.me'];
window.isProductionWebsite = trackJSDomains.some(val => window.location.host.endsWith(val));

if (window.isProductionWebsite) {
    window._trackJs = { token: '346262e7ffef497d85874322fff3bbf8', application: 'smartcharts' };
    const s = document.createElement('script');
    s.src = 'https://cdn.trackjs.com/releases/current/tracker.js';
    document.body.appendChild(s);
}
/* // PWA support is temporarily removed until its issues can be sorted out
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${window.location.origin + window.location.pathname}sw.js`)
        .then(() => {
            console.log('Service Worker Registered');
        }).catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
        });
}
*/
configure({ enforceActions: 'observed' });
function getLanguageStorage() {
    const default_language = 'en';
    try {
        const setting_string = localStorage.getItem('smartchart-setting') || '',
            setting = JSON.parse(setting_string !== '' ? setting_string : '{}');
        return setting.language || default_language;
    } catch (e) {
        return default_language;
    }
}
function getServerUrl() {
    const local = localStorage.getItem('config.server_url');
    return `wss://${local || 'red.derivws.com'}/websockets/v3`;
}
const chartId = '1';
const appId = localStorage.getItem('config.app_id') || 12812;
const serverUrl = getServerUrl();
const language = new URLSearchParams(window.location.search).get('l') || getLanguageStorage();
const today = moment().format('YYYY/MM/DD 00:00');
const connectionManager = new ConnectionManager({
    appId,
    language,
    endpoint: serverUrl,
});
const IntervalEnum = {
    second: 1,
    minute: 60,
    hour: 3600,
    day: 24 * 3600,
    year: 365 * 24 * 3600,
};
const activeLanguages = [
    'EN',
    'BN',
    'DE',
    'AR',
    'ES',
    'FR',
    'ID',
    'IT',
    'KM',
    'KO',
    'MN',
    'PL',
    'PT',
    'RU',
    'SI',
    'SW',
    'TR',
    'TH',
    'UZ',
    'VI',
    'ZH_CN',
    'ZH_TW',
];
const streamManager = new StreamManager(connectionManager);
// Get trading times data
const tradingTimesPromise = connectionManager.send({ trading_times: 'today' });

// Create dummy data for masterData instead of fetching from API
const createDummyData = (type: 'tick' | 'candle' = 'tick'): TicksHistoryResponse => {
    const now = new Date();
    
    if (type === 'tick') {
        // Return tick history format
        const prices: number[] = [];
        const times: number[] = [];
        
        for (let i = 0; i < 1000; i++) {
            const date = new Date(now.getTime() - (1000 - i) * 60 * 1000);
            const price = 100 + Math.random() * 10;
            const epoch = Math.floor(date.getTime() / 1000);
            
            prices.push(price);
            times.push(epoch);
        }
        
        return {
            history: {
                prices,
                times,
            },
            msg_type: "history",
            echo_req: {
                ticks_history: "R_100",
                style: "ticks",
                count: 1000,
            },
        };
    }
    
    // Return candle format
    const candles = [];
    
    for (let i = 0; i < 1000; i++) {
        const date = new Date(now.getTime() - (1000 - i) * 60 * 1000);
        const close = 100 + Math.random() * 100;
        const open = close - Math.random() * 20;
        const high = close + Math.random() * 20;
        const low = open - Math.random() * 20;
        const epoch = Math.floor(date.getTime() / 1000);
        
        candles.push({
            close,
            epoch,
            high,
            low,
            open,
        });
    }
    
    return {
        candles,
        msg_type: "candles",
        echo_req: {
            ticks_history: "R_100",
            style: "candles",
            count: 1000,
        },
    };
};

const dummyMasterData = createDummyData();

const getTickHistory = ({ symbol, granularity, count, start, end, style }: { symbol: string; granularity: number; count: number; start?: number; end?: number, style?: string  }): Promise<any> => {
    console.log('getTickHistory called with', { symbol, granularity, count, start, end, style });
    
    // Determine whether to return tick or candle data based on style parameter
    // If style is 'ticks', return tick data, otherwise return candle data
    const dataType = !granularity ? 'tick' : 'candle';
    const dummyData = createDummyData(dataType);
    
    // In a real app, you would fetch the data from an API
    // For now, just return dummy data as a Promise
    return dummyData;
};

// Create getQuotes function for subscribing to real-time quotes
// Store cleanup functions for each subscription
const quoteCleanupFunctions: Record<string, () => void> = {};

const getQuotes = ({ symbol, granularity, style }: { symbol: string; granularity?: number; style?: string }, callback: (quote: any) => void): (() => void) => {
    console.log('getQuotes called for symbol', symbol, 'with granularity', granularity, 'and style', style);
    
    // In a real app, this would subscribe to real-time quotes via WebSocket
    // For demo purposes, we'll simulate real-time updates with an interval
    const intervalId = setInterval(() => {
        const now = new Date();
        const epoch = Math.floor(now.getTime() / 1000);
        
        // Generate base values for our quotes
        const basePrice = 100 + Math.random() * 10; // Use same scale as history data
        const randomChange = (Math.random() - 0.5) * 2;
        const newClose = basePrice + randomChange;
        const newOpen = newClose - Math.random() * 1;
        const newHigh = Math.max(newClose, newOpen) + Math.random() * 1;
        const newLow = Math.min(newClose, newOpen) - Math.random() * 1;
        
        // Generate a random UUID for the subscription ID
        const uuid = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[x]/g, () => {
            return (Math.random() * 16 | 0).toString(16);
        });
        
        if (!granularity || style === 'ticks') {
            // Tick format - matches the history.prices and history.times format
            const tickResponse = {
                echo_req: {
                    adjust_start_time: 1,
                    count: 1000,
                    end: "latest",
                    req_id: Math.floor(Math.random() * 100),
                    style: "ticks",
                    subscribe: 1,
                    ticks_history: symbol,
                },
                msg_type: "tick",
                req_id: Math.floor(Math.random() * 100),
                subscription: {
                    id: uuid,
                },
                tick: {
                    ask: newClose + 0.1,
                    bid: newClose - 0.1,
                    epoch,
                    id: uuid,
                    pip_size: 2,
                    quote: newClose,
                    symbol,
                },
            };
            
            callback(tickResponse);
        } else {
            // OHLC format - matches the candles format
            const ohlcResponse = {
                echo_req: {
                    adjust_start_time: 1,
                    count: 1000,
                    end: "latest",
                    granularity: granularity || 60,
                    req_id: Math.floor(Math.random() * 100),
                    style: "candles",
                    subscribe: 1,
                    ticks_history: symbol,
                },
                msg_type: "ohlc",
                req_id: Math.floor(Math.random() * 100),
                subscription: {
                    id: uuid,
                },
                ohlc: {
                    close: newClose.toString(),
                    epoch,
                    granularity: granularity || 60,
                    high: newHigh.toString(),
                    id: uuid,
                    low: newLow.toString(),
                    open: newOpen.toString(),
                    open_time: epoch - (granularity || 60),
                    pip_size: 2,
                    symbol,
                },
            };
            
            callback(ohlcResponse);
        }
    }, 1000); // Update every second
    
    // Return a function to unsubscribe
    const cleanupFunction = () => {
        clearInterval(intervalId);
        console.log('Unsubscribed from quotes for symbol', symbol);
    };
    
    // Store the cleanup function with a key based on symbol and granularity
    const key = `${symbol}-${granularity || 0}`;
    quoteCleanupFunctions[key] = cleanupFunction;
    
    return cleanupFunction;
};
const requestAPI = connectionManager.send.bind(connectionManager);
const requestSubscribe = streamManager.subscribe.bind(streamManager);

// Modified requestForget to also cancel the getQuotes interval
const requestForget = (request: any, callback: any) => {
    // Call the original forget method
    streamManager.forget(request, callback);
    
    // Extract symbol and granularity from the request to create the key
    const { ticks_history: symbol, granularity } = request;
    const key = `${symbol}-${granularity || 0}`;
    
    // If we have a cleanup function for this subscription, call it
    if (quoteCleanupFunctions[key]) {
        quoteCleanupFunctions[key]();
        delete quoteCleanupFunctions[key];
        console.log('Cancelled getQuotes interval for', key);
    }
};
const App = () => {
    const startingLanguageRef = React.useRef('en');
    const [tradingTimes, setTradingTimes] = React.useState<TradingTimesResponse['trading_times'] | undefined>(undefined);
    const [masterData, setMasterData] = React.useState<TQuote[] | undefined>(undefined);

    React.useEffect(() => {
        tradingTimesPromise.then(response => {
            if (response.trading_times) {
                setTradingTimes(response.trading_times);
            }
        });

        // Use dummy data instead of fetching from API
        setMasterData(dummyMasterData);
    }, []);

    const [notifier] = React.useState(new ChartNotifier());
    const [layoutString] = React.useState(localStorage.getItem(`layout-${chartId}`) || '');
    const [layout] = React.useState(JSON.parse(layoutString !== '' ? layoutString : '{}'));
    const initialSettings = React.useMemo(() => {
        let _settings = createObjectFromLocalStorage('smartchart-setting');
        if (_settings) {
            _settings.language = language;
            startingLanguageRef.current = _settings.language;
        } else {
            _settings = { language };
        }
        _settings.activeLanguages = activeLanguages;
        if (_settings.historical) {
            _settings.isHighestLowestMarkerEnabled = false;
        }
        return _settings;
    }, []);

    const [settings, setSettings] = React.useState(initialSettings);
    const settingsRef = React.useRef<typeof settings>();
    settingsRef.current = settings;

    const memoizedValues = React.useMemo(() => {
        let endEpoch: number | undefined,
            granularity: number | undefined,
            chartType = '',
            symbol = '';
        if (settingsRef.current.historical) {
            endEpoch = new Date(`${today}:00Z`).valueOf() / 1000;
            chartType = 'line';
            granularity = 0;
            if (layout) {
                granularity =
                    layout.timeUnit === 'second'
                        ? 0
                        : parseInt(
                              (layout.interval * IntervalEnum[layout.timeUnit as keyof typeof IntervalEnum]).toString(),
                              10
                          ); // eslint-disable-line
                if (layout.chartType === 'candles' && layout.aggregationType !== 'ohlc') {
                    chartType = layout.aggregationType;
                } else {
                    chartType = layout.chartType;
                }
                symbol = layout.symbol;
            }
        }
        return {
            chartType,
            granularity,
            endEpoch,
            symbol,
        };
    }, [layout]);
    const [chartType, setChartType] = React.useState<string | undefined>(memoizedValues.chartType);
    const [granularity, setGranularity] = React.useState<TGranularity>(memoizedValues.granularity as TGranularity);
    const [endEpoch, setEndEpoch] = React.useState(memoizedValues.endEpoch);
    const [isConnectionOpened, setIsConnectionOpened] = React.useState(true);
    const [networkStatus, setNetworkStatus] = React.useState<TNetworkConfig>();
    const [symbol, setSymbol] = React.useState<string>(memoizedValues.symbol);
    const allTicks: keyof AuditDetailsForExpiredContract | [] = [];
    const contractInfo: keyof ProposalOpenContract | Record<string, never> = {};
    React.useEffect(() => {
        connectionManager.on(ConnectionManager.EVENT_CONNECTION_CLOSE, () => setIsConnectionOpened(false));
        connectionManager.on(ConnectionManager.EVENT_CONNECTION_REOPEN, () => setIsConnectionOpened(true));
        const networkMonitor = NetworkMonitor.getInstance();
        networkMonitor.init(requestAPI, handleNetworkStatus);
    }, []);
    /*
    shouldComponentUpdate(nextProps, nextState) {
        return this.state.symbol !== nextState.symbol
            || JSON.stringify(this.state.settings) !== JSON.stringify(nextState.settings);
    }
    */
    const handleNetworkStatus = (status: TNetworkConfig) => setNetworkStatus(status);
    const saveSettings = React.useCallback(newSettings => {
        const prevSetting = settingsRef.current;
        console.log('settings updated:', newSettings);
        localStorage.setItem('smartchart-setting', JSON.stringify(newSettings));
        if (!prevSetting.historical && newSettings.historical) {
            setChartType('line');
            setGranularity(0);
            setEndEpoch(new Date(`${today}:00Z`).valueOf() / 1000);
        } else if (!newSettings.historical) {
            handleDateChange('');
        }
        setSettings(newSettings);
        if (startingLanguageRef.current !== newSettings.language) {
            // Place language in URL:
            const { origin, search, pathname } = window.location;
            const url = new URLSearchParams(search);
            url.delete('l');
            url.set('l', newSettings.language);
            window.location.href = `${origin}${pathname}?${url.toString()}`;
        }
    }, []);
    const handleDateChange = (value: string) => {
        setEndEpoch(value !== '' ? new Date(`${value}:00Z`).valueOf() / 1000 : undefined);
    };
    const handleStateChange: TStateChangeListener = (tag, option) =>
        console.log(`chart state changed to ${tag} with the option of ${option ? JSON.stringify(option) : '{}'}`);
    const renderTopWidgets = React.useCallback(() => {
        const symbolChange = (new_symbol: string) => {
            logEvent(LogCategories.ChartTitle, LogActions.MarketSelector, new_symbol);
            notifier.removeByCategory('activesymbol');
            setSymbol(new_symbol);
        };
        return (
            <>
                <ChartTitle onChange={symbolChange} isNestedList={isMobile} />
                {settingsRef.current.historical ? <ChartHistory onChange={handleDateChange} /> : ''}
                <Notification notifier={notifier} />
            </>
        );
    }, [notifier]);
    const renderControls = React.useCallback(() => <ChartSetting />, []);
    const renderToolbarWidget = React.useCallback(() => {
        const changeGranularity = (timePeriod: TGranularity) => setGranularity(timePeriod);
        const changeChartType = (_chartType?: string) => setChartType(_chartType);
        return (
            <ToolbarWidget>
                <ChartMode onChartType={changeChartType} onGranularity={changeGranularity} />
                <StudyLegend />
                <Views onChartType={changeChartType} onGranularity={changeGranularity} />
                <DrawTools />
                <Share />
            </ToolbarWidget>
        );
    }, []);
    const onMessage = (e: TNotification) => {
        notifier.notify(e);
    };
    const getIsChartReady = (isChartReady: boolean) => isChartReady;
    const onMarkerRef = (ref: TRefData | null) => {
        if (ref) {
            ref.setPosition({
                epoch: endEpoch,
            });
        }
    };
    const ref = React.useRef(null);

    return (
        <SmartChart
            ref={ref}
            id={chartId}
            chartStatusListener={(isChartReady: boolean) => getIsChartReady(isChartReady)}
            stateChangeListener={handleStateChange}
            isMobile={isMobile}
            symbol={symbol}
            settings={settings}
            onMessage={onMessage}
            enableRouting
            topWidgets={renderTopWidgets}
            toolbarWidget={renderToolbarWidget}
            chartControlsWidgets={renderControls}
            requestAPI={requestAPI}
            requestSubscribe={requestSubscribe}
            requestForget={requestForget}
            endEpoch={endEpoch}
            chartType={chartType}
            granularity={granularity}
            crosshairState={isMobile ? 0 : null}
            crosshairTooltipLeftAllow={660}
            onSettingsChange={saveSettings}
            isConnectionOpened={isConnectionOpened}
            networkStatus={networkStatus}
            isLive
            enabledChartFooter
            allTicks={allTicks}
            contractInfo={contractInfo}
            chartData={{ tradingTimes }}
            getTickHistory={getTickHistory}
            getQuotes={getQuotes}
            getIndicatorHeightRatio={(chart_height: number, indicator_count: number) => {
                const isSmallScreen = chart_height < 780;
                const denominator = indicator_count >= 5 ? indicator_count : indicator_count + 1;
                const reservedHeight = isMobile ? 100 : 320;
                const indicatorsHeight = Math.round(
                    (chart_height - (reservedHeight + (isSmallScreen ? 20 : 0))) / denominator
                );
                return {
                    height: indicatorsHeight,
                    percent: indicatorsHeight / chart_height,
                };
            }}
        >
            {endEpoch ? (
                <Marker className='chart-marker-historical' markerRef={onMarkerRef}>
                    <span>
                        {moment(endEpoch * 1000)
                            .utc()
                            .format('DD MMMM YYYY - HH:mm')}
                    </span>
                </Marker>
            ) : (
                ''
            )}
        </SmartChart>
    );
};
ReactDOM.render(<App />, document.getElementById('root'));
