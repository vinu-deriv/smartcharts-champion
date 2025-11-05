import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:chart_app/src/interop/js_interop.dart';
import 'package:deriv_chart/deriv_chart.dart';

/// State and methods of chart web adapter config.
class DrawingToolModel {
  /// Initialize
  DrawingToolModel() {
    // Initialize drawing tools and repository
    drawingToolsRepo = AddOnsRepository<DrawingToolConfig>(
      createAddOn: (Map<String, dynamic> map) =>
          DrawingToolConfig.fromJson(map),
      onDeleteCallback: (AddOnConfig item, int index) {
        final Map<String, dynamic> config = item.toJson(); 
        // Convert the config to a JSON string and then parse it back to ensure it's properly serialized
        final String jsonConfigString = jsonEncode(config); 
        // Pass both the name and the full config object
        JsInterop.drawingTool?.onRemove?.call(config['name'], jsonConfigString);
      },
      sharedPrefKey: 'drawing_tools',
    );

    drawingTools = DrawingTools(
      onMouseEnterCallback: (int index) =>
          JsInterop.drawingTool?.onMouseEnter?.call(index),
      onMouseExitCallback: (int index) =>
          JsInterop.drawingTool?.onMouseExit?.call(index),
    )..drawingToolsRepo = drawingToolsRepo;

    interactiveLayerBehaviour.controller.addListener(_onControllerStateChanged);

    // Add listener to the repository to detect when drawing tools are added/removed
    drawingToolsRepo.addListener(_onDrawingToolsRepoChanged);
    
    // Initialize previous repository length
    _previousRepoLength = 0;
  }
  
  // Track the previous repository length to detect additions
  int _previousRepoLength = 0;
  
  // Flag to indicate if we're in the initial loading phase
  // During this phase, we don't want to trigger onToolAdded events
  bool _isInitialLoading = true;

  InteractiveLayerBehaviour interactiveLayerBehaviour =
      InteractiveLayerDesktopBehaviour();

  /// Symbol of the chart
  String symbol = '';

  /// Drawing tools repo
  late AddOnsRepository<DrawingToolConfig> drawingToolsRepo;

  /// DrawingTools
  late DrawingTools drawingTools;

  InteractiveLayerController get interactiveLayerController =>
      interactiveLayerBehaviour.controller;

  /// Initialize new chart
  void newChart(JSNewChart payload) {
    symbol = payload.symbol ?? '';

    // Wait for the chart to be fully initialized before loading drawing tools
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      // TODO(Jim): Find a better way to ensure the chart is ready
      // Wait for chart initialization to complete
      await Future.delayed(const Duration(milliseconds: 500));
      await _loadSavedDrawingTools();
    });
  }

  Future<void> _loadSavedDrawingTools() async {
    _isInitialLoading = true;   
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    drawingToolsRepo.loadFromPrefs(prefs, symbol);

    // Use WidgetsBinding to ensure the UI is ready and then notify JavaScript
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      // TODO(Jim): Find a better way to ensure the chart is ready
      // Add a delay to ensure the chart is fully initialized and ready to render
      await Future.delayed(const Duration(milliseconds: 300));

      final List<String> drawingToolsJson = getDrawingToolsRepoItems();
      if (drawingToolsJson.isNotEmpty) {
        // Notify JavaScript side that drawing tools have been loaded
        JsInterop.drawingTool?.onLoad?.call(drawingToolsJson);
        _previousRepoLength = drawingToolsRepo.items.length;
      }
      _isInitialLoading = false;
    });
  }

  /// To select a drawing
  void selectDrawing(DrawingToolConfig config) {
    drawingTools.onDrawingToolSelection(config);
  }

  /// function to get drawtool items
  // List<DrawingToolConfig>? getDrawingToolsRepoItems() => drawingToolsRepo.items;

  ///
  List<String> getDrawingToolsRepoItems() =>
      drawingToolsRepo.items.map((e) => jsonEncode(e)).toList();

  updateFloatingMenuPosition(double x, double y) {
    interactiveLayerController.floatingMenuPosition = Offset(x, y);
  }

  void startAddingNewTool(String type) {
    final DrawingToolConfig config = getConfigFromType(type);
    interactiveLayerController.startAddingNewTool(config);
  }

  void cancelAddingNewTool() {
    interactiveLayerController.cancelAdding();
  }

  void _onControllerStateChanged() {
    if (interactiveLayerController.currentState is InteractiveAddingToolState) {
      final addingState =
          interactiveLayerController.currentState as InteractiveAddingToolState;
      final stepInfo = addingState.addingStateInfo;

      // Notify TypeScript about state change
      if (stepInfo != null) {
        JsInterop.drawingTool?.onStateChanged?.call(
          stepInfo.currentStep,
          stepInfo.totalSteps,
        );

        // If we've completed all steps, sync the drawing tools with JavaScript
        if (stepInfo.currentStep == stepInfo.totalSteps) {
          // Use WidgetsBinding to ensure proper timing
          WidgetsBinding.instance.addPostFrameCallback((_) async {
            // TODO(Jim): Find a better way to ensure the chart is ready
            // Ensure the drawing tool is properly saved before notifying
            await Future.delayed(const Duration(milliseconds: 150));

            // The native repository should automatically save to SharedPreferences
            // Just sync with JavaScript side by calling onLoad with current items
            final List<String> drawingToolsJson = getDrawingToolsRepoItems();
            JsInterop.drawingTool?.onLoad?.call(drawingToolsJson);

            // Trigger update to refresh the UI count and display
            JsInterop.drawingTool?.onUpdate?.call();
          });
        }
      }
    }
  }

  void _onDrawingToolsRepoChanged() {
    // Notify JavaScript side when drawing tools repository changes
    // This triggers a refresh of the UI to show the updated drawing tools count
    if (_previousRepoLength < drawingToolsRepo.items.length) {
      // Get the newly added tools
      final List<DrawingToolConfig> newTools = drawingToolsRepo.items.sublist(_previousRepoLength);
      for (final DrawingToolConfig tool in newTools) {
        final String toolJson = jsonEncode(tool);
        
        // Only notify about new tools if we're not in the initial loading phase
        if (!_isInitialLoading) {
          JsInterop.drawingTool?.onToolAdded?.call(toolJson);
        }
      }
    }
    _previousRepoLength = drawingToolsRepo.items.length;
    JsInterop.drawingTool?.onUpdate?.call();
  }

  /// To remove an existing drawing tool
  void removeDrawingTool(int index) {
    drawingToolsRepo.removeAt(index);
  }

  updateInteractiveLayerBehaviour(InteractiveLayerBehaviour newBehaviour) {
    if (interactiveLayerBehaviour.runtimeType != newBehaviour.runtimeType) {
      interactiveLayerBehaviour = newBehaviour;
      interactiveLayerBehaviour.controller
          .addListener(_onControllerStateChanged);
    }
  }

  DrawingToolConfig getConfigFromType(String type) {
    // TODO(Anyone): Uncomment the below cases when their implementations
    // are done.
    switch (type) {
      case 'vertical':
        return const VerticalDrawingToolConfig();
      case 'line':
        return const LineDrawingToolConfig();
      // case 'ray':
      //   return const RayDrawingToolConfig();
      // case 'continuous':
      //   return const ContinuousDrawingToolConfig();
      // case 'trend':
      //   return const TrendDrawingToolConfig();
      case 'horizontal':
        return const HorizontalDrawingToolConfig();
      // case 'channel':
      //   return const ChannelDrawingToolConfig();
      // case 'fibfan':
      //   return const FibfanDrawingToolConfig();
      // case 'rectangle':
      //   return const RectangleDrawingToolConfig();
      default:
        throw Exception('Unknown drawing tool type: $type');
    }
  }

  /// To clear the selection of drawing tool
  void clearDrawingToolSelect() {
    drawingTools.clearDrawingToolSelection();
  }

  /// To clear all drawing tool
  void clearDrawingTool() {
    drawingTools.clearDrawingToolSelection();
    drawingToolsRepo.clear();
  }
}
