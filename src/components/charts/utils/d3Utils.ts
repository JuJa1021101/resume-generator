import * as d3 from 'd3';
import { D3ChartData, D3ChartMargins, ChartTheme } from '../types';

// Create SVG element with responsive viewBox
export const createResponsiveSVG = (
  container: HTMLElement,
  width: number,
  height: number,
  margins: D3ChartMargins
): d3.Selection<SVGSVGElement, unknown, null, undefined> => {
  // Remove existing SVG
  d3.select(container).select('svg').remove();

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  return svg;
};

// Create chart group with margins
export const createChartGroup = (
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  margins: D3ChartMargins
): d3.Selection<SVGGElement, unknown, null, undefined> => {
  return svg.append('g')
    .attr('transform', `translate(${margins.left}, ${margins.top})`);
};

// Create scales for different chart types
export const createScales = (
  data: D3ChartData[],
  width: number,
  height: number,
  type: 'linear' | 'ordinal' | 'time' = 'linear'
) => {
  const xScale = type === 'ordinal'
    ? d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, width])
      .padding(0.1)
    : d3.scaleLinear()
      .domain(d3.extent(data, d => d.value) as [number, number])
      .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value) || 0])
    .range([height, 0]);

  return { xScale, yScale };
};

// Create color scale
export const createColorScale = (
  data: D3ChartData[],
  theme: ChartTheme
): d3.ScaleOrdinal<string, string> => {
  return d3.scaleOrdinal<string>()
    .domain(data.map(d => d.category))
    .range(theme.colors.primary);
};

// Create axes
export const createAxes = (
  chartGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: any,
  yScale: d3.ScaleLinear<number, number>,
  width: number,
  height: number,
  theme: ChartTheme
) => {
  // X axis
  const xAxis = d3.axisBottom(xScale);
  chartGroup.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height})`)
    .call(xAxis)
    .selectAll('text')
    .style('fill', theme.colors.text)
    .style('font-family', theme.fonts.family)
    .style('font-size', `${theme.fonts.size.small}px`);

  // Y axis
  const yAxis = d3.axisLeft(yScale);
  chartGroup.append('g')
    .attr('class', 'y-axis')
    .call(yAxis)
    .selectAll('text')
    .style('fill', theme.colors.text)
    .style('font-family', theme.fonts.family)
    .style('font-size', `${theme.fonts.size.small}px`);

  // Style axis lines
  chartGroup.selectAll('.domain')
    .style('stroke', theme.colors.grid);

  chartGroup.selectAll('.tick line')
    .style('stroke', theme.colors.grid);
};

// Create grid lines
export const createGridLines = (
  chartGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: any,
  yScale: d3.ScaleLinear<number, number>,
  width: number,
  height: number,
  theme: ChartTheme
) => {
  // Horizontal grid lines
  chartGroup.selectAll('.horizontal-grid')
    .data(yScale.ticks())
    .enter()
    .append('line')
    .attr('class', 'horizontal-grid')
    .attr('x1', 0)
    .attr('x2', width)
    .attr('y1', d => yScale(d))
    .attr('y2', d => yScale(d))
    .style('stroke', theme.colors.grid)
    .style('stroke-width', 0.5)
    .style('opacity', 0.5);

  // Vertical grid lines (for ordinal scales)
  if (xScale.bandwidth) {
    chartGroup.selectAll('.vertical-grid')
      .data(xScale.domain())
      .enter()
      .append('line')
      .attr('class', 'vertical-grid')
      .attr('x1', d => (xScale(d) || 0) + xScale.bandwidth() / 2)
      .attr('x2', d => (xScale(d) || 0) + xScale.bandwidth() / 2)
      .attr('y1', 0)
      .attr('y2', height)
      .style('stroke', theme.colors.grid)
      .style('stroke-width', 0.5)
      .style('opacity', 0.3);
  }
};

// Create tooltip
export const createTooltip = (
  container: HTMLElement,
  theme: ChartTheme
): d3.Selection<HTMLDivElement, unknown, null, undefined> => {
  return d3.select(container)
    .append('div')
    .attr('class', 'chart-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background-color', theme.colors.background)
    .style('color', theme.colors.text)
    .style('border', `1px solid ${theme.colors.grid}`)
    .style('border-radius', '8px')
    .style('padding', '12px')
    .style('font-family', theme.fonts.family)
    .style('font-size', `${theme.fonts.size.small}px`)
    .style('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1)')
    .style('pointer-events', 'none')
    .style('z-index', '1000');
};

// Show tooltip
export const showTooltip = (
  tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>,
  content: string,
  event: MouseEvent
) => {
  tooltip
    .style('visibility', 'visible')
    .html(content)
    .style('left', `${event.pageX + 10}px`)
    .style('top', `${event.pageY - 10}px`);
};

// Hide tooltip
export const hideTooltip = (
  tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>
) => {
  tooltip.style('visibility', 'hidden');
};

// Create smooth transitions
export const createTransition = (
  duration: number = 1000,
  easing: string = 'easeInOutQuart'
): d3.Transition<d3.BaseType, unknown, null, undefined> => {
  return d3.transition()
    .duration(duration)
    .ease(d3[easing as keyof typeof d3] as any);
};

// Create radar chart path generator
export const createRadarPathGenerator = (
  radius: number,
  angleSlice: number
) => {
  return d3.lineRadial<number>()
    .angle((d, i) => i * angleSlice)
    .radius(d => d * radius)
    .curve(d3.curveLinearClosed);
};

// Create radar chart scales
export const createRadarScales = (
  data: number[],
  radius: number
) => {
  const maxValue = d3.max(data) || 100;

  return d3.scaleLinear()
    .domain([0, maxValue])
    .range([0, radius]);
};

// Format numbers for display
export const formatNumber = (value: number, decimals: number = 1): string => {
  return d3.format(`.${decimals}f`)(value);
};

// Format percentage
export const formatPercentage = (value: number): string => {
  return d3.format('.0%')(value / 100);
};

// Create legend
export const createLegend = (
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: D3ChartData[],
  colorScale: d3.ScaleOrdinal<string, string>,
  theme: ChartTheme,
  position: { x: number; y: number }
) => {
  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${position.x}, ${position.y})`);

  const legendItems = legend.selectAll('.legend-item')
    .data(data)
    .enter()
    .append('g')
    .attr('class', 'legend-item')
    .attr('transform', (d, i) => `translate(0, ${i * 20})`);

  legendItems.append('rect')
    .attr('width', 12)
    .attr('height', 12)
    .style('fill', d => colorScale(d.category));

  legendItems.append('text')
    .attr('x', 18)
    .attr('y', 6)
    .attr('dy', '0.35em')
    .style('fill', theme.colors.text)
    .style('font-family', theme.fonts.family)
    .style('font-size', `${theme.fonts.size.small}px`)
    .text(d => d.name);

  return legend;
};