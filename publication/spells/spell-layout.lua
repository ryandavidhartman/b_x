local function stringify(inlines)
  return pandoc.utils.stringify(inlines)
end

local function trim(text)
  return text:gsub("^%s+", ""):gsub("%s+$", "")
end

local function escape_html(text)
  local replacements = {
    ["&"] = "&amp;",
    ["<"] = "&lt;",
    [">"] = "&gt;",
    ['"'] = "&quot;",
    ["'"] = "&#39;",
  }

  return (text:gsub("[&<>'\"]", replacements))
end

local function escape_latex(text)
  local replacements = {
    ["\\"] = "\\textbackslash{}",
    ["{"] = "\\{",
    ["}"] = "\\}",
    ["$"] = "\\$",
    ["&"] = "\\&",
    ["#"] = "\\#",
    ["%"] = "\\%",
    ["_"] = "\\_",
  }

  return (text:gsub("[\\{}$&#%%_]", replacements))
end

local function is_pdf_pagebreak_div(block)
  return block.t == "Div" and block.classes and block.classes:includes("pagebreak-pdf")
end

local function is_pdf_columnbreak_div(block)
  return block.t == "Div" and block.classes and block.classes:includes("columnbreak-pdf")
end

local function is_center_div(block)
  return block.t == "Div" and block.classes and block.classes:includes("center")
end

local function latex_blocks_for_block(block)
  if is_center_div(block) then
    local rebuilt = { pandoc.RawBlock("latex", "\\begin{center}") }
    for _, inner in ipairs(block.content) do
      table.insert(rebuilt, inner)
    end
    table.insert(rebuilt, pandoc.RawBlock("latex", "\\end{center}"))
    return rebuilt
  end

  return { block }
end

local function split_statblock_row(text)
  local trimmed = trim(text)
  if trimmed == "" or not trimmed:find("|") or trimmed:sub(-1) ~= "|" then
    return nil
  end

  local cells = {}
  for cell in trimmed:gmatch("([^|]*)|") do
    cells[#cells + 1] = trim(cell)
  end

  if #cells ~= 4 or cells[1] == "" or cells[2] == "" or cells[3] == "" or cells[4] == "" then
    return nil
  end

  return cells
end

local function statblock_rows_from_lineblock(block)
  if block.t ~= "LineBlock" then
    return nil
  end

  local rows = {}

  for _, line in ipairs(block.content) do
    local cells = split_statblock_row(stringify(line))
    if not cells then
      return nil
    end
    table.insert(rows, cells)
  end

  if #rows == 0 then
    return nil
  end

  return rows
end

local function statblock_html_block(rows)
  local lines = { '<table class="statblock"><tbody>' }

  for _, row in ipairs(rows) do
    table.insert(
      lines,
      '<tr><td class="stat-label">' .. escape_html(row[1]) .. "</td>"
        .. '<td class="stat-value">' .. escape_html(row[2]) .. "</td>"
        .. '<td class="stat-label">' .. escape_html(row[3]) .. "</td>"
        .. '<td class="stat-value">' .. escape_html(row[4]) .. "</td></tr>"
    )
  end

  table.insert(lines, "</tbody></table>")
  return pandoc.RawBlock("html", table.concat(lines))
end

local function statblock_latex_block(rows)
  local lines = {
    "\\begin{center}",
    "\\footnotesize",
    "\\begin{tabularx}{\\columnwidth}{@{}>{\\bfseries}lX>{\\bfseries}lX@{}}",
    "\\toprule",
  }

  for index, row in ipairs(rows) do
    table.insert(
      lines,
      escape_latex(row[1]) .. " & "
        .. escape_latex(row[2]) .. " & "
        .. escape_latex(row[3]) .. " & "
        .. escape_latex(row[4]) .. " \\\\"
    )
  end

  table.insert(lines, "\\bottomrule")
  table.insert(lines, "\\end{tabularx}")
  table.insert(lines, "\\end{center}")

  return pandoc.RawBlock("latex", table.concat(lines, "\n"))
end

local function normalize_custom_statblocks(blocks)
  local normalized = {}

  for _, block in ipairs(blocks) do
    local rows = statblock_rows_from_lineblock(block)
    if rows then
      if FORMAT:match("html") then
        table.insert(normalized, statblock_html_block(rows))
      elseif FORMAT:match("latex") then
        table.insert(normalized, statblock_latex_block(rows))
      else
        table.insert(normalized, block)
      end
    else
      table.insert(normalized, block)
    end
  end

  return normalized
end

local function pagebreak_blocks(in_columns)
  local blocks = {}

  if in_columns then
    table.insert(blocks, pandoc.RawBlock("latex", "\\end{multicols}"))
  end

  table.insert(blocks, pandoc.RawBlock("latex", "\\newpage"))

  if in_columns then
    table.insert(blocks, pandoc.RawBlock("latex", "\\begin{multicols}{2}"))
  end

  return blocks
end

local function columnbreak_blocks(in_columns)
  if not in_columns then
    return {}
  end

  return { pandoc.RawBlock("latex", "\\columnbreak") }
end

function Pandoc(doc)
  local blocks = normalize_custom_statblocks(doc.blocks)

  if FORMAT:match("html") then
    return pandoc.Pandoc(blocks, doc.meta)
  end

  if not FORMAT:match("latex") then
    return pandoc.Pandoc(blocks, doc.meta)
  end

  local marker_index = nil

  for index, block in ipairs(blocks) do
    if block.t == "Header" and block.level == 2 and stringify(block.content) == "Spell Descriptions" then
      marker_index = index
      break
    end
  end

  local rebuilt = {}

  for index, block in ipairs(blocks) do
    if not marker_index or index <= marker_index then
      if is_pdf_pagebreak_div(block) then
        for _, raw in ipairs(pagebreak_blocks(false)) do
          table.insert(rebuilt, raw)
        end
      elseif is_pdf_columnbreak_div(block) then
        for _, raw in ipairs(columnbreak_blocks(false)) do
          table.insert(rebuilt, raw)
        end
      else
        for _, inner in ipairs(latex_blocks_for_block(block)) do
          table.insert(rebuilt, inner)
        end
      end
    elseif index == marker_index + 1 then
      table.insert(rebuilt, pandoc.RawBlock("latex", "\\begin{multicols}{2}"))
      if is_pdf_pagebreak_div(block) then
        for _, raw in ipairs(pagebreak_blocks(true)) do
          table.insert(rebuilt, raw)
        end
      elseif is_pdf_columnbreak_div(block) then
        for _, raw in ipairs(columnbreak_blocks(true)) do
          table.insert(rebuilt, raw)
        end
      else
        for _, inner in ipairs(latex_blocks_for_block(block)) do
          table.insert(rebuilt, inner)
        end
      end
    else
      if is_pdf_pagebreak_div(block) then
        for _, raw in ipairs(pagebreak_blocks(true)) do
          table.insert(rebuilt, raw)
        end
      elseif is_pdf_columnbreak_div(block) then
        for _, raw in ipairs(columnbreak_blocks(true)) do
          table.insert(rebuilt, raw)
        end
      else
        for _, inner in ipairs(latex_blocks_for_block(block)) do
          table.insert(rebuilt, inner)
        end
      end
    end
  end

  if marker_index then
    table.insert(rebuilt, pandoc.RawBlock("latex", "\\end{multicols}"))
  end

  return pandoc.Pandoc(rebuilt, doc.meta)
end
