import 'dart:ui' as ui;

import 'package:chart_app/src/interop/js_interop.dart';
import 'package:deriv_chart/deriv_chart.dart';
import 'package:flutter/material.dart';

/// CustomLinePainter
class CustomLinePainter extends LinePainter {
  /// Intialize
  CustomLinePainter(DataSeries<Tick> series) : super(series);

  @override
  void onPaintData(
    Canvas canvas,
    Size size,
    EpochToX epochToX,
    QuoteToY quoteToY,
    AnimationInfo animationInfo,
  ) {
    super.onPaintData(canvas, size, epochToX, quoteToY, animationInfo);

    // Compute the lerped quote value exactly as Flutter does for the line
    // animation. This ensures JS barriers use the exact same interpolated
    // value.
    double? lerpedQuote;
    if (series.entries != null && series.entries!.isNotEmpty) {
      final Tick lastTick = series.entries!.last;
      final Tick lastVisibleTick = series.visibleEntries.last;

      if (lastTick == lastVisibleTick && series.prevLastEntry != null) {
        lerpedQuote = ui.lerpDouble(
          series.prevLastEntry!.entry.quote,
          lastTick.quote,
          animationInfo.currentTickPercent,
        );
      }
    }

    JsInterop.onMainSeriesPaint(animationInfo.currentTickPercent, lerpedQuote);
  }
}
