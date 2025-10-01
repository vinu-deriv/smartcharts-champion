import 'dart:js';

import 'package:deriv_chart/deriv_chart.dart';
import 'package:js/js.dart';

/// Called when an addOn is to be edited
typedef OnEditCallback = void Function(int index);

/// Allow Updation when dragged (drawing tool)
typedef OnUpdateCallback = void Function();

/// Swaps two elements of a list.
typedef OnSwapCallback = void Function(int index1, int index2);

/// OnLoadCallback
typedef OnLoadCallback = void Function(List<dynamic> config);

/// JS Interop
@JS('window.jsInterop')
class JsInterop {
  /// Called when the chart has loaded
  external static void onChartLoad();

  /// Called on each line series paint
  external static void onMainSeriesPaint(double currentTickPercent);

  /// Called when visible area is change
  external static void onVisibleAreaChanged(int leftEpoch, int rightEpoch);

  /// Called when visible quote area is change
  external static void onQuoteAreaChanged(double topQuote, double bottomQuote);

  /// Called to load additional history
  external static void loadHistory(JsLoadHistoryReq request);

  /// Indicator options
  external static JsIndicators? indicators;

  /// Drawingtool options
  external static JsDrawings? drawingTool;
}

@JS()
@anonymous

/// Load history props
class JsLoadHistoryReq {
  /// JsLoadHistoryReq Object
  external factory JsLoadHistoryReq({int count, int end});

  /// No of ticks/candles
  external int count;

  /// End time
  external int end;
}

@JS()
@anonymous

/// Payload for new chart init
class JSNewChart {
  /// Whether the chart should be showing live data or not.
  external bool get isLive;

  /// Whether data fit mode is enabled.
  external bool get startWithDataFitMode;

  /// Granularity of the chart data
  external int get granularity;

  /// Market symbol
  external String? get symbol;

  /// Style of the chart
  external String? get chartType;

  /// Dart theme or light theme
  external String? get theme;

  /// Specifies the zoom level of the chart.
  external double? get msPerPx;

  /// Pipsize of the chart.
  external int? get pipSize;

  /// Specified if it is in mobile mode.
  external bool get isMobile;

  /// Specifies the margin of yAxis.
  external JSYAxisMargin get yAxisMargin;

  /// Whether smooth chart animations are enabled.
  external bool? get isSmoothChartEnabled;
}

@JS()
@anonymous

/// Contract props
class JSContractsUpdate {
  /// List of markers belongs to a contract
  external List<JsMarker> markers;

  /// Contract type
  external String type;

  /// Color of the markers
  external String? get color;

  /// Extra props needed to customize contract painting
  external JsObject? props;
}

@JS()
@anonymous

/// Marker props
class JsMarker {
  /// Quote
  external double? get quote;

  /// Epoch
  external int? get epoch;

  /// Marker text
  external String? get text;

  /// Marker type
  external String? get type;

  /// Marker color
  external String? get color;

  /// Marker direction
  external String? get direction;
}

@JS()
@anonymous

/// Quote props
class JsQuote {
  /// Close value of the candle/tick
  external double get Close;

  /// High value of the candle
  external double? get High;

  /// Low value of the candle
  external double? get Low;

  /// Open value of the candle
  external double? get Open;

  /// Date of the quote data
  external String get Date;
}

@JS()
@anonymous

/// Indicator props
class JsIndicators {
  /// Called when an indicator is removed
  external OnEditCallback? onRemove;

  /// Called when an indicator is edited
  external OnEditCallback? onEdit;

  ///
  external OnUpdateCallback? onUpdate;

  /// Callback to swap two elements of a list.
  external OnSwapCallback? onSwap;
}

/// Called when an addOn is created
typedef OnAddDrawingCallback = void Function();

/// Called when a drawing tool is removed with JSON data
typedef OnRemoveDrawingCallback = void Function(String deletedToolName);

/// Called when drawing tool state changes
typedef OnStateChangedCallback = void Function(int currentStep, int totalSteps);

@JS()
@anonymous

/// Drawings
class JsDrawings {
  /// Called when an drawing is added
  external OnAddDrawingCallback? onAdd;

  /// Called when an drawing is edited/dragged
  external OnUpdateCallback? onUpdate;

  /// Called when the data is loaded from prefs
  external OnLoadCallback? onLoad;

  /// Called when an drawing is removed
  external OnRemoveDrawingCallback? onRemove;

  /// Called when an drawing is edited
  external OnEditCallback? onEdit;

  /// Callback to swap two elements of a list.
  external OnSwapCallback? onSwap;

  /// Callback to notify mouse enter over the addon.
  external OnMouseEnterCallback? onMouseEnter;

  /// Callback to notify mouse exit over the addon.
  external OnMouseExitCallback? onMouseExit;

  /// Called when drawing tool state changes
  external OnStateChangedCallback? onStateChanged;
}

@JS()
@anonymous

/// JsIndicatorTooltip
class JsIndicatorTooltip {
  /// JsLoadHistoryReq Object
  external factory JsIndicatorTooltip({String name, List<String?> values});

  /// Name
  external String name;

  /// Value
  external List<String> values;
}

@JS()
@anonymous

/// JSYAxisMargin
class JSYAxisMargin {
  /// Top
  external double? top;

  /// Bottom
  external double? bottom;
}
