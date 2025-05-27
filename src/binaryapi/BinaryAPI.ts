import {
    ActiveSymbolsResponse,
    ServerTimeResponse,
    TicksHistoryRequest,
    TicksHistoryResponse,
    TradingTimesResponse,
} from 'src/types/api-types';
import {
    TBinaryAPIRequest,
    TGetQuotes,
    TGetTickHistory,
    TGranularity,
    TRequestAPI,
    TRequestForget,
    TRequestForgetStream,
    TRequestSubscribe,
    TResponseAPICallback,
} from 'src/types';

type TicksHistoryRequestPartial = Omit<TicksHistoryRequest, 'count' | 'ticks_history'> & {
    count?: number;
};

export type TCreateTickHistoryParams = TicksHistoryRequestPartial & { symbol: string };
export default class BinaryAPI {
    requestAPI: TRequestAPI;
    requestForget: TRequestForget;
    requestForgetStream?: TRequestForgetStream;
    requestSubscribe: TRequestSubscribe;
    _getTickHistory: TGetTickHistory;
    _getQuotes: TGetQuotes;
    static get DEFAULT_COUNT() {
        return 1000;
    }
    streamRequests: Record<string, { request: TBinaryAPIRequest; callback: TResponseAPICallback }> = {};
    tradingTimesCache: TradingTimesResponse | null = null;

    constructor(
        requestAPI: TRequestAPI,
        requestSubscribe: TRequestSubscribe,
        requestForget: TRequestForget,
        getTickHistory:TGetTickHistory,
        getQuotes: TGetQuotes,
        requestForgetStream?: TRequestForgetStream
    ) {
        this.requestAPI = requestAPI;
        this.requestSubscribe = requestSubscribe;
        this.requestForget = requestForget;
        this.requestForgetStream = requestForgetStream;
        this._getTickHistory = getTickHistory;
        this._getQuotes = getQuotes;
    }
    getActiveSymbols(): Promise<ActiveSymbolsResponse> {
        return this.requestAPI({ active_symbols: 'brief' }) as Promise<ActiveSymbolsResponse>;
    }
    getServerTime(): Promise<ServerTimeResponse> {
        return this.requestAPI({ time: 1 }) as Promise<ServerTimeResponse>;
    }
    async getTradingTimes(trading_times = 'today'): Promise<TradingTimesResponse> {
        if (this.tradingTimesCache && (this.tradingTimesCache.trading_times as unknown) === trading_times) {
            return { ...this.tradingTimesCache };
        }
        const response = (await this.requestAPI({ trading_times })) as TradingTimesResponse;
        if (trading_times !== 'today') {
            this.tradingTimesCache = { ...response };
        }
        return response;
    }
    async getTickHistory(params: TCreateTickHistoryParams): Promise<TicksHistoryResponse> {
        const request = BinaryAPI.createTickHistoryRequest(params);
        if (this._getTickHistory) {
            console.log('Using custom getTickHistory function');
            const quotes = await this._getTickHistory({
                symbol: params.symbol,
                granularity: params.granularity as number,
                count: typeof params.count === 'string' ? parseInt(params.count, 10) : (params.count || BinaryAPI.DEFAULT_COUNT),
                start: typeof params.start === 'string' ? parseInt(params.start, 10) : params.start,
                end: typeof params.end === 'string' ? parseInt(params.end, 10) : params.end,
            });
            
            // Create a mock TicksHistoryResponse from the quotes
            if (params.granularity) {
                
                return {
                    candles: quotes.candles,
                    msg_type: 'candles',
                    echo_req: request,
                };
            }
            
            // For ticks style
            const times = quotes.history.times;
            const prices = quotes.history.prices;
            return {
                history: {
                    times,
                    prices,
                },
                msg_type: 'history',
                echo_req: request,
            };
        }
        console.log('Falling back to requestAPI for tick history');
    }
    subscribeTickHistory(params: TCreateTickHistoryParams, callback: TResponseAPICallback) {
        const key = this._getKey(params);
        const request = BinaryAPI.createTickHistoryRequest({ ...params, subscribe: 1 });
        this.streamRequests[key] = { request, callback };
        
        // Send a copy of the request, in case it gets mutated outside
        this._getQuotes({ symbol: params.symbol, granularity: params.granularity,
 }, callback);
    }
    forget(params: { symbol: string; granularity: TGranularity }) {
        debugger;
        const key = this._getKey(params as TCreateTickHistoryParams);
        if (!this.streamRequests[key]) return;
        const { request, callback } = this.streamRequests[key];
        delete this.streamRequests[key];
        return this.requestForget(request, callback);
    }
    forgetStream(subscription_id: string) {
        debugger
        if (this.requestForgetStream && typeof this.requestForgetStream === 'function') {
            return this.requestForgetStream(subscription_id);
        }
    }
    static createTickHistoryRequest({
        symbol,
        granularity,
        start,
        end,
        subscribe,
        adjust_start_time = 1,
        count,
    }: TCreateTickHistoryParams) {
        const request: TicksHistoryRequestPartial & { ticks_history: string } = {
            ticks_history: symbol,
            style: granularity ? 'candles' : 'ticks',
            end: 'latest',
            count: count || BinaryAPI.DEFAULT_COUNT,
        };
        if (granularity) {
            // granularity will only be set if style=candles
            request.granularity = +granularity as TicksHistoryRequest['granularity'];
        }
        if (adjust_start_time) {
            request.adjust_start_time = adjust_start_time;
        }
        if (subscribe) {
            request.subscribe = 1;
        }
        if (start) {
            delete request.count;
            request.start = start;
        }
        if (end) {
            request.end = end;
        }
        return request;
    }
    _getKey({ symbol, granularity }: TCreateTickHistoryParams) {
        return `${symbol}-${granularity}`;
    }
}
