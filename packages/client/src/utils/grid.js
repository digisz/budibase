import { GridSpacing } from "constants"
import { GridRowHeight } from "constants"
import { builderStore } from "stores"
import { buildStyleString } from "utils/styleable.js"

/**
 * We use CSS variables on components to control positioning and layout of
 * components inside grids.
 * --grid-[mobile/desktop]-[row/col]-[start-end]: for positioning
 * --grid-[mobile/desktop]-[h/v]-align: for layout of inner components within
 *  the components grid bounds
 *
 * Component definitions define their default layout preference via the
 * `grid.hAlign` and `grid.vAlign` keys in the manifest.
 *
 * We also apply grid-[mobile/desktop]-grow CSS classes to component wrapper
 * DOM nodes to use later in selectors, to control the sizing of children.
 */

// Enum representing the different CSS variables we use for grid metadata
export const GridParams = {
  HAlign: "h-align",
  VAlign: "v-align",
  ColStart: "col-start",
  ColEnd: "col-end",
  RowStart: "row-start",
  RowEnd: "row-end",
}

// Classes used in selectors inside grid containers to control child styles
export const GridClasses = {
  DesktopFill: "grid-desktop-grow",
  MobileFill: "grid-mobile-grow",
}

// Enum for device preview type, included in grid CSS variables
const Devices = {
  Desktop: "desktop",
  Mobile: "mobile",
}

// Builds a CSS variable name for a certain piece of grid metadata
export const getGridVar = (device, param) => `--grid-${device}-${param}`

// Determines whether a JS event originated from immediately within a grid
export const isGridEvent = e => {
  return (
    e.target
      .closest?.(".component")
      ?.parentNode.closest(".component")
      ?.childNodes[0]?.classList?.contains("grid") ||
    e.target.classList.contains("anchor")
  )
}

// Determines whether a DOM element is an immediate child of a grid
export const isGridChild = node => {
  return node?.parentNode.classList.contains("grid")
}

// Gets the component ID of the closest parent grid
export const getGridParent = node => {
  return node?.parentNode?.closest(".grid")
}

// Svelte action to apply required class names and styles to our component
// wrappers
export const gridLayout = (node, metadata) => {
  let selectComponent

  // Applies the required listeners, CSS and classes to a component DOM node
  const applyMetadata = metadata => {
    const { id, styles, interactive, errored, definition, draggable, active } =
      metadata
    if (!active) {
      return
    }

    // Callback to select the component when clicking on the wrapper
    selectComponent = e => {
      e.stopPropagation()
      builderStore.actions.selectComponent(id)
    }

    // Generate base set of grid CSS vars based for this component
    let width = errored ? 500 : definition.size?.width || 200
    let height = errored ? 60 : definition.size?.height || 200
    width += 2 * GridSpacing
    height += 2 * GridSpacing
    const hAlign = errored ? "stretch" : definition?.grid?.hAlign || "stretch"
    const vAlign = errored ? "stretch" : definition?.grid?.vAlign || "center"
    const vars = {
      "--default-width": width,
      "--default-height": height,
      "--grid-desktop-h-align": hAlign,
      "--grid-mobile-h-align": hAlign,
      "--grid-desktop-v-align": vAlign,
      "--grid-mobile-v-align": vAlign,

      // Variables for automatically determining grid height
      "--grid-desktop-row-end": Math.ceil(height / GridRowHeight) + 1,
      "--grid-mobile-row-end": Math.ceil(height / GridRowHeight) + 1,
    }

    // Extract any other CSS variables from the saved component styles
    for (let style of Object.keys(styles)) {
      if (style.startsWith("--")) {
        vars[style] = styles[style]
        delete styles[style]
      }
    }

    // Apply some metadata to data attributes to speed up lookups
    const desktopRowEnd = `${vars["--grid-desktop-row-end"]}`
    const mobileRowEnd = `${vars["--grid-mobile-row-end"]}`
    if (node.dataset.gridDesktopRowEnd !== desktopRowEnd) {
      node.dataset.gridDesktopRowEnd = desktopRowEnd
    }
    if (node.dataset.gridMobileRowEnd !== mobileRowEnd) {
      node.dataset.gridMobileRowEnd = mobileRowEnd
    }

    // Apply all CSS variables to the wrapper
    node.style = buildStyleString(vars)

    // Toggle classes to specify whether our children should fill
    node.classList.toggle(
      GridClasses.DesktopFill,
      vars[getGridVar(Devices.Desktop, GridParams.VAlign)] === "stretch"
    )
    node.classList.toggle(
      GridClasses.MobileFill,
      vars[getGridVar(Devices.Mobile, GridParams.VAlign)] === "stretch"
    )

    // Add a listener to select this node on click
    if (interactive) {
      node.addEventListener("click", selectComponent, false)
    }

    // Add draggable attribute
    node.setAttribute("draggable", !!draggable)
  }

  // Removes the previously set up listeners
  const removeListeners = () => {
    node.removeEventListener("click", selectComponent)
  }

  applyMetadata(metadata)

  return {
    update(newMetadata) {
      removeListeners()
      applyMetadata(newMetadata)
    },
    destroy() {
      removeListeners()
    },
  }
}
