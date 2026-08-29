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

local function sort_key(text)
  return stringify(text):lower()
end

local function latex_cell(blocks)
  local rendered = stringify(blocks)
  rendered = rendered:gsub("%s*\n%s*", " ")
  return escape_latex(trim(rendered))
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

  if #cells == 2 then
    cells[3] = ""
    cells[4] = ""
  end

  if #cells ~= 4 or cells[1] == "" or cells[2] == "" then
    return nil
  end

  local trailing_pair_is_blank = cells[3] == "" and cells[4] == ""
  local trailing_pair_is_complete = cells[3] ~= "" and cells[4] ~= ""

  if not trailing_pair_is_blank and not trailing_pair_is_complete then
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
    "\\begin{tabularx}{\\columnwidth}{@{}>{\\bfseries}l>{\\raggedright\\arraybackslash}X>{\\bfseries}l>{\\raggedright\\arraybackslash}X@{}}",
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

local function header_identifier(header)
  if header.identifier and header.identifier ~= "" then
    return header.identifier
  end

  return stringify(header.content)
    :lower()
    :gsub("[^%w]+", "-")
    :gsub("^-+", "")
    :gsub("-+$", "")
end
 
local function entry_label_name(entry_id)
  return "monster-entry:" .. entry_id
end

local function chapter_label_name(chapter_id)
  return "chapter:" .. chapter_id
end

local function add_entry_label(blocks, entry_id)
  local labeled = {}
  local inserted = false

  for _, block in ipairs(blocks) do
    table.insert(labeled, block)
    if not inserted and block.t == "Header" and block.level == 3 then
      table.insert(labeled, pandoc.RawBlock("latex", "\\phantomsection\\label{" .. entry_label_name(entry_id) .. "}"))
      inserted = true
    end
  end

  return labeled
end

local function is_pdf_pagebreak_div(block)
  return block.t == "Div" and block.classes and block.classes:includes("pagebreak-pdf")
end

local function is_lair_treasure_table_div(block)
  return block.t == "Div" and block.classes and block.classes:includes("lair-treasure-table-pdf")
end

local function is_individual_treasure_table_div(block)
  return block.t == "Div" and block.classes and block.classes:includes("individual-treasure-table-pdf")
end

local function is_unguarded_treasure_table_div(block)
  return block.t == "Div" and block.classes and block.classes:includes("unguarded-treasure-table-pdf")
end

local function is_pdf_columnbreak_div(block)
  return block.t == "Div" and block.classes and block.classes:includes("columnbreak-pdf")
end

local function is_pdf_twocolumn_begin_div(block)
  return block.t == "Div" and block.classes and block.classes:includes("twocolumn-pdf-begin")
end

local function is_pdf_twocolumn_end_div(block)
  return block.t == "Div" and block.classes and block.classes:includes("twocolumn-pdf-end")
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

local function group_monster_entries(blocks)
  local grouped = {}
  local current_blocks = nil
  local current_classes = nil

  local function flush_current()
    if current_blocks then
      table.insert(grouped, pandoc.Div(current_blocks, pandoc.Attr("", current_classes)))
      current_blocks = nil
      current_classes = nil
    end
  end

  for _, block in ipairs(blocks) do
    if block.t == "Header" and block.level == 3 then
      flush_current()
      current_blocks = { block }
      current_classes = { "monster-entry" }
    elseif block.t == "Header" and block.level <= 2 then
      flush_current()
      table.insert(grouped, block)
    elseif current_blocks then
      table.insert(current_blocks, block)
    else
      table.insert(grouped, block)
    end
  end

  flush_current()

  return grouped
end

local function table_column_spec(column_count)
  if column_count == 1 then
    return "@{}X@{}"
  end

  local spec = { "@{}>{\\bfseries}l" }
  for _ = 2, column_count do
    table.insert(spec, "X")
  end
  table.insert(spec, "@{}")
  return table.concat(spec, "")
end

local function table_to_tabularx(tbl, width_macro)
  local lines = {}
  local header_cells = {}
  local column_count = #tbl.headers
  local column_spec = table_column_spec(column_count)
  local table_width = width_macro or "\\columnwidth"

  for _, cell in ipairs(tbl.headers) do
    table.insert(header_cells, latex_cell(cell))
  end

  table.insert(lines, "\\begin{center}")
  table.insert(lines, "\\small")
  table.insert(lines, "\\begin{tabularx}{" .. table_width .. "}{" .. column_spec .. "}")
  table.insert(lines, "\\toprule")
  table.insert(lines, table.concat(header_cells, " & ") .. " \\\\")
  table.insert(lines, "\\midrule")

  for _, row in ipairs(tbl.rows) do
    local row_cells = {}
    for _, cell in ipairs(row) do
      table.insert(row_cells, latex_cell(cell))
    end
    table.insert(lines, table.concat(row_cells, " & ") .. " \\\\")
  end

  table.insert(lines, "\\bottomrule")
  table.insert(lines, "\\end{tabularx}")
  table.insert(lines, "\\end{center}")

  return pandoc.RawBlock("latex", table.concat(lines, "\n"))
end

-- Bespoke renderer shared by the Appendix B treasure tables (Lair Treasures,
-- Individual Treasures), matching the classic two-line header / two-line
-- Gems-and-Jewelry-cell layout of the original AD&D DMG treasure tables
-- rather than the generic evenly-spaced tabularx used for every other table
-- in this book.
local TREASURE_TABLE_COLUMN_WIDTHS = {
  "0.045\\textwidth",
  "0.105\\textwidth",
  "0.105\\textwidth",
  "0.105\\textwidth",
  "0.105\\textwidth",
  "0.105\\textwidth",
  "0.13\\textwidth",
  "0.185\\textwidth",
}
local LAIR_TREASURE_HEADERS = {
  { "Type" },
  { "100's of", "Copper" },
  { "100's of", "Silver" },
  { "100's of", "Electrum" },
  { "100's of", "Gold" },
  { "100's of", "Platinum" },
  { "Gems and", "Jewelry" },
  { "Magic Items" },
}
local INDIVIDUAL_TREASURE_HEADERS = {
  { "Type" },
  { "Pieces of", "Copper" },
  { "Pieces of", "Silver" },
  { "Pieces of", "Electrum" },
  { "Pieces of", "Gold" },
  { "Pieces of", "Platinum" },
  { "Gems and", "Jewelry" },
  { "Magic Items" },
}
local UNGUARDED_TREASURE_HEADERS = {
  { "Level" },
  { "100's of", "Copper" },
  { "100's of", "Silver" },
  { "100's of", "Electrum" },
  { "100's of", "Gold" },
  { "100's of", "Platinum" },
  { "Gems and", "Jewelry" },
  { "Magic Items" },
}
local TREASURE_TABLE_GEMS_COLUMN = 7

local function treasure_table_gems_cell(escaped_text)
  local first, second = escaped_text:match("^(.-)%s*/%s*(.-)$")
  if not first and escaped_text == "None" then
    first, second = "None", "None"
  end

  if first then
    return "\\parbox[t]{\\linewidth}{\\raggedright " .. trim(first) .. "\\\\" .. trim(second) .. "}"
  end

  return escaped_text
end

local function treasure_table_to_tabularx(tbl, headers)
  if #tbl.headers ~= #TREASURE_TABLE_COLUMN_WIDTHS then
    return table_to_tabularx(tbl, "\\textwidth")
  end

  local lines = { "\\begin{center}", "\\small", "\\renewcommand{\\arraystretch}{1.15}" }

  local colspec = { "@{}" }
  for i, width in ipairs(TREASURE_TABLE_COLUMN_WIDTHS) do
    local prefix = (i == 1) and "\\bfseries\\raggedright\\arraybackslash" or "\\raggedright\\arraybackslash"
    table.insert(colspec, ">{" .. prefix .. "}p{" .. width .. "}")
    if i < #TREASURE_TABLE_COLUMN_WIDTHS then
      table.insert(colspec, "@{\\hspace{4pt}}")
    end
  end
  table.insert(colspec, "@{}")

  table.insert(lines, "\\begin{tabular}{" .. table.concat(colspec, "") .. "}")
  table.insert(lines, "\\toprule")

  local header_row1, header_row2, has_second_line = {}, {}, false
  for _, h in ipairs(headers) do
    table.insert(header_row1, "\\bfseries " .. h[1])
    table.insert(header_row2, h[2] and ("\\bfseries " .. h[2]) or "")
    has_second_line = has_second_line or h[2] ~= nil
  end

  table.insert(lines, table.concat(header_row1, " & ") .. " \\\\")
  if has_second_line then
    table.insert(lines, table.concat(header_row2, " & ") .. " \\\\")
  end
  table.insert(lines, "\\midrule")
  table.insert(lines, "\\addlinespace[3pt]")

  for _, row in ipairs(tbl.rows) do
    local cells = {}
    for i, cell in ipairs(row) do
      local text = latex_cell(cell)
      if i == TREASURE_TABLE_GEMS_COLUMN then
        text = treasure_table_gems_cell(text)
      end
      table.insert(cells, text)
    end
    table.insert(lines, table.concat(cells, " & ") .. " \\\\[3pt]")
  end

  table.insert(lines, "\\bottomrule")
  table.insert(lines, "\\end{tabular}")
  table.insert(lines, "\\end{center}")

  return pandoc.RawBlock("latex", table.concat(lines, "\n"))
end

local function process_regular_entry_for_latex(blocks)
  local processed = {}

  for _, block in ipairs(blocks) do
    if is_pdf_pagebreak_div(block) then
      for _, raw in ipairs(pagebreak_blocks(true)) do
        table.insert(processed, raw)
      end
    elseif is_pdf_columnbreak_div(block) then
      for _, raw in ipairs(columnbreak_blocks(true)) do
        table.insert(processed, raw)
      end
    elseif block.t == "Table" then
      table.insert(processed, table_to_tabularx(block, "\\columnwidth"))
    else
      for _, inner in ipairs(latex_blocks_for_block(block)) do
        table.insert(processed, inner)
      end
    end
  end

  return processed
end

local function header_text_from_entry(div)
  if not div or div.t ~= "Div" or not div.content or not div.content[1] then
    return nil
  end

  local first = div.content[1]
  if first.t ~= "Header" then
    return nil
  end

  return stringify(first.content)
end

-- Emits a chapter heading (level <=2) between closing and reopening
-- multicols, in single-column mode, instead of as the first thing inside a
-- freshly (re)opened multicols environment (multicols' internal
-- column-balancing pass can otherwise disrupt anchor placement for content
-- right at its start). Also records a manually-placed \phantomsection\label
-- *after* the heading text — mirroring the Index section's proven-correct
-- pattern — for the Contents section (see build_contents_section) to link
-- to, rather than relying on native \tableofcontents + hyperref's automatic
-- section-anchor (confirmed unreliable in this document via named-destination
-- inspection: printed ToC page numbers were correct but link targets were
-- 1-6+ pages early, even after this multicols fix). Fixed 2026-07-26.
local function emit_chapter_heading_outside_columns(rebuilt, toc_entries, header_block)
  table.insert(rebuilt, pandoc.RawBlock("latex", "\\end{multicols}"))
  table.insert(rebuilt, pandoc.RawBlock("latex", "\\newpage"))
  for _, inner in ipairs(latex_blocks_for_block(header_block)) do
    table.insert(rebuilt, inner)
  end
  local chapter_id = header_identifier(header_block)
  table.insert(rebuilt, pandoc.RawBlock("latex", "\\phantomsection\\label{" .. chapter_label_name(chapter_id) .. "}"))
  table.insert(toc_entries, { name = stringify(header_block.content), id = chapter_id })
  table.insert(rebuilt, pandoc.RawBlock("latex", "\\begin{multicols}{2}"))
end

local function process_two_column_section(blocks)
  local grouped = group_monster_entries(blocks)
  local rebuilt = {}
  local index_entries = {}
  local toc_entries = {}

  table.insert(rebuilt, pandoc.RawBlock("latex", "\\begin{multicols}{2}"))

  local i = 1
  local n = #grouped
  while i <= n do
    local block = grouped[i]
    local next_block = grouped[i + 1]
    local next_is_chapter_heading = next_block and next_block.t == "Header" and next_block.level <= 2

    if block.t == "Div" and block.classes:includes("monster-entry") then
      local entry_name = header_text_from_entry(block)
      local entry_header = block.content[1]
      local entry_id = header_identifier(entry_header)

      table.insert(index_entries, { name = entry_name, id = entry_id })

      -- A pagebreak-pdf div directly following a monster's own content (and
      -- preceding the next top-level Header) gets absorbed as trailing
      -- content of *this* entry by group_monster_entries, rather than
      -- appearing as its own top-level block. Strip it here so it can be
      -- handled below with knowledge of what follows this entry.
      local content = block.content
      local trailing_pagebreak = #content > 0 and is_pdf_pagebreak_div(content[#content])
      if trailing_pagebreak then
        local trimmed = {}
        for j = 1, #content - 1 do
          table.insert(trimmed, content[j])
        end
        content = trimmed
      end

      for _, inner in ipairs(process_regular_entry_for_latex(add_entry_label(content, entry_id))) do
        table.insert(rebuilt, inner)
      end

      if trailing_pagebreak then
        if next_is_chapter_heading then
          emit_chapter_heading_outside_columns(rebuilt, toc_entries, next_block)
          i = i + 1
        else
          for _, raw in ipairs(pagebreak_blocks(true)) do
            table.insert(rebuilt, raw)
          end
        end
      end
    elseif is_pdf_pagebreak_div(block) then
      if next_is_chapter_heading then
        emit_chapter_heading_outside_columns(rebuilt, toc_entries, next_block)
        i = i + 1
      else
        for _, raw in ipairs(pagebreak_blocks(true)) do
          table.insert(rebuilt, raw)
        end
      end
    elseif is_pdf_columnbreak_div(block) then
      for _, raw in ipairs(columnbreak_blocks(true)) do
        table.insert(rebuilt, raw)
      end
    elseif block.t == "Header" and block.level <= 2 then
      -- Defensive fallback: a chapter heading reached here without a
      -- preceding pagebreak-pdf marker (not expected given this book's
      -- convention, but handled so it's never silently missing from Contents).
      for _, inner in ipairs(latex_blocks_for_block(block)) do
        table.insert(rebuilt, inner)
      end
      local chapter_id = header_identifier(block)
      table.insert(rebuilt, pandoc.RawBlock("latex", "\\phantomsection\\label{" .. chapter_label_name(chapter_id) .. "}"))
      table.insert(toc_entries, { name = stringify(block.content), id = chapter_id })
    else
      for _, inner in ipairs(latex_blocks_for_block(block)) do
        table.insert(rebuilt, inner)
      end
    end
    i = i + 1
  end

  table.insert(rebuilt, pandoc.RawBlock("latex", "\\end{multicols}"))

  return rebuilt, index_entries, toc_entries
end

local function build_index_section(index_entries)
  if #index_entries == 0 then
    return {}
  end

  local lines = {
    "\\clearpage",
    "\\section*{Index}",
    "\\phantomsection",
    "\\label{" .. chapter_label_name("index") .. "}",
    "\\addcontentsline{toc}{section}{Index}",
    "\\markboth{Index}{Index}",
    "\\begingroup",
    "\\small",
    "\\raggedright",
    "\\begin{multicols}{2}",
  }

  for _, entry in ipairs(index_entries) do
    table.insert(
      lines,
      "\\hyperref[" .. entry_label_name(entry.id) .. "]{" .. escape_latex(entry.name) .. "}"
        .. "\\dotfill"
        .. "\\hyperref[" .. entry_label_name(entry.id) .. "]{\\pageref*{" .. entry_label_name(entry.id) .. "}}\\par"
    )
  end

  table.insert(lines, "\\end{multicols}")
  table.insert(lines, "\\endgroup")

  return { pandoc.RawBlock("latex", table.concat(lines, "\n")) }
end

-- Manually-built Contents page, linking via the \phantomsection\label pairs
-- placed right after each chapter heading (see emit_chapter_heading_outside_
-- columns) rather than native \tableofcontents + hyperref's automatic
-- section-anchor. Kept in document order (unlike the alphabetical Index).
local function build_contents_section(toc_entries)
  if #toc_entries == 0 then
    return {}
  end

  local lines = {
    "\\section*{Contents}",
    "\\phantomsection",
    "\\addcontentsline{toc}{section}{Contents}",
    "\\begingroup",
    "\\raggedright",
  }

  for _, entry in ipairs(toc_entries) do
    table.insert(
      lines,
      "\\hyperref[" .. chapter_label_name(entry.id) .. "]{" .. escape_latex(entry.name) .. "}"
        .. "\\dotfill"
        .. "\\hyperref[" .. chapter_label_name(entry.id) .. "]{\\pageref*{" .. chapter_label_name(entry.id) .. "}}\\par"
    )
  end

  table.insert(lines, "\\endgroup")
  table.insert(lines, "\\clearpage")

  return { pandoc.RawBlock("latex", table.concat(lines, "\n")) }
end

-- HTML-only: bucket every plate image into one of 3 standard display widths
-- (see img-sm/img-md/img-lg in combined-monsters.css) based on its native
-- pixel width, so the web page reads consistently instead of each <img>
-- rendering at its raw scan size. Does not affect the PDF/LaTeX build.
local HTML_IMAGE_WIDTH_CLASS = {
  ["aboleth-plate.png"] = "md",
  ["amon-plate.png"] = "lg",
  ["animated-armor-plate.png"] = "md",
  ["ankheg-plate.png"] = "md",
  ["apatosaurus-plate.png"] = "sm",
  ["ape-plate.png"] = "sm",
  ["asmodeus-plate.png"] = "sm",
  ["axe-beak-plate.png"] = "sm",
  ["baalzebul-plate.png"] = "sm",
  ["badger-plate.png"] = "md",
  ["bael-plate.png"] = "md",
  ["bahamut-plate.png"] = "sm",
  ["baluchitherium-plate.png"] = "sm",
  ["bandit-plate.png"] = "md",
  ["baphomet-plate.png"] = "md",
  ["barbed-devil-plate.png"] = "sm",
  ["basilisk-plate.png"] = "md",
  ["bat-plate.png"] = "md",
  ["bear-plate.png"] = "md",
  ["behir-plate.png"] = "md",
  ["beholder-plate.png"] = "sm",
  ["belial-plate.png"] = "md",
  ["berserker-plate.png"] = "sm",
  ["black-pudding-plate.png"] = "sm",
  ["blink-dog-plate.png"] = "md",
  ["boar-plate.png"] = "md",
  ["bone-devil-plate.png"] = "sm",
  ["bone-golem-plate.png"] = "md",
  ["brachiosaurus-plate.png"] = "sm",
  ["brain-mole-plate.png"] = "sm",
  ["brownie-plate.png"] = "sm",
  ["bugbear-fighting-adventurer.png"] = "md",
  ["bugbear-plate.png"] = "sm",
  ["buletteplate.png"] = "sm",
  ["camel-plate.png"] = "md",
  ["carrion-crawler-plate.png"] = "md",
  ["cat-great-plate.png"] = "md",
  ["catoblepas-plate.png"] = "sm",
  ["cattle-plate.png"] = "lg",
  ["centaur-plate.png"] = "sm",
  ["ceratosaurus-plate.png"] = "sm",
  ["chimera-plate.png"] = "sm",
  ["cockatrice-plate.png"] = "md",
  ["couatl-plate.png"] = "sm",
  ["crocodile-plate.png"] = "md",
  ["dao-plate.png"] = "md",
  ["death-knight-plate.png"] = "md",
  ["demilich-plate.png"] = "lg",
  ["demogorgon-plate.png"] = "sm",
  ["devil-swine-plate.png"] = "md",
  ["dispater-plate.png"] = "sm",
  ["displacer-beast-plate.png"] = "sm",
  ["djinni-plate.png"] = "sm",
  ["doppelganger-plate.png"] = "sm",
  ["dragon-breath-diagram.png"] = "md",
  ["dragon-plate.png"] = "md",
  ["dragon-turtle-plate.png"] = "sm",
  ["dragonne-plate.png"] = "sm",
  ["drider-plate.png"] = "sm",
  ["driver-ant-plate.png"] = "md",
  ["drow-plate.png"] = "md",
  ["dryad-plate.png"] = "md",
  ["duergar-plate.png"] = "lg",
  ["dungeon-starting-areas-diagram.png"] = "lg",
  ["dwarf-plate.png"] = "sm",
  ["eel-plate.png"] = "md",
  ["efreeti-full-plate.png"] = "sm",
  ["efreeti-plate.png"] = "md",
  ["elemental-plate.png"] = "sm",
  ["elf-plate.png"] = "sm",
  ["erinyes-plate.png"] = "sm",
  ["ettin-plate.png"] = "sm",
  ["eye-of-the-deep-plate.png"] = "sm",
  ["faerie-dragon-plate.png"] = "md",
  ["fish-plate.png"] = "md",
  ["flesh-golem-plate.png"] = "sm",
  ["fraz-urbluu-plate.png"] = "md",
  ["gargoyle-plate.png"] = "sm",
  ["gas-spore-plate.png"] = "md",
  ["gelatinous-cube-plate.png"] = "md",
  ["geryon-plate.png"] = "sm",
  ["ghost-plate.png"] = "sm",
  ["ghoul-plate.png"] = "sm",
  ["giant-beetle-plate.png"] = "md",
  ["giant-centipede-plate.png"] = "md",
  ["giant-frog-plate.png"] = "md",
  ["giant-gar-plate.png"] = "md",
  ["giant-lynx-plate.png"] = "lg",
  ["giant-pike-plate.png"] = "md",
  ["giant-plate.png"] = "md",
  ["giant-scorpion-plate.png"] = "md",
  ["giant-sea-horse-plate.png"] = "lg",
  ["giant-slug-plate.png"] = "md",
  ["giant-wasp-plate.png"] = "sm",
  ["gibbering-mouther-plate.png"] = "md",
  ["githyanki-plate.png"] = "md",
  ["githzerai-plate.png"] = "lg",
  ["glasya-plate.png"] = "lg",
  ["gnoll-plate.png"] = "sm",
  ["gnome-plate.png"] = "sm",
  ["goat-plate.png"] = "sm",
  ["goblin-plate.png"] = "sm",
  ["gorgon-plate.png"] = "md",
  ["gorgosaurus-plate.png"] = "sm",
  ["gray-ooze-plate.png"] = "sm",
  ["grazzt-plate.png"] = "lg",
  ["green-slime-plate.png"] = "sm",
  ["griffon-plate.png"] = "md",
  ["groaning-spirit-plate.png"] = "sm",
  ["halfling-plate.png"] = "sm",
  ["harpy-plate.png"] = "md",
  ["hippocampus-plate.png"] = "sm",
  ["hippogriff-plate.png"] = "md",
  ["hobgoblin-plate.png"] = "sm",
  ["homunculus-plate.png"] = "sm",
  ["hook-horror-plate.png"] = "md",
  ["horned-devil-plate.png"] = "sm",
  ["horse-plate.png"] = "lg",
  ["hutijin-plate.png"] = "md",
  ["hydra-plate.png"] = "md",
  ["ice-devil-plate.png"] = "sm",
  ["iguanodon-plate.png"] = "sm",
  ["imp-plate.png"] = "sm",
  ["intellect-devourer-plate.png"] = "sm",
  ["intro-plate.png"] = "lg",
  ["ixitxachitl-plate.png"] = "md",
  ["jackalwere-plate.png"] = "sm",
  ["juiblex-plate.png"] = "md",
  ["ki-rin-plate.png"] = "md",
  ["killer-bee-plate.png"] = "md",
  ["kobold-plate.png"] = "md",
  ["kostchtchie-plate.png"] = "lg",
  ["kraken-plate.png"] = "lg",
  ["kuo-toa-plate.png"] = "lg",
  ["lamia-plate.png"] = "sm",
  ["lammasu-plate.png"] = "sm",
  ["lamprey-plate.png"] = "md",
  ["larva-plate.png"] = "md",
  ["leech-plate.png"] = "lg",
  ["legendary-plate.png"] = "lg",
  ["lemure-plate.png"] = "sm",
  ["leprechaun-plate.png"] = "sm",
  ["leucrotta-plate.png"] = "sm",
  ["lich-plate.png"] = "sm",
  ["lizard-man-plate.png"] = "md",
  ["lizards-giant-plate.png"] = "md",
  ["locathah-plate.png"] = "sm",
  ["lolth-plate.png"] = "lg",
  ["lurker-above-plate.png"] = "sm",
  ["mammon-plate.png"] = "lg",
  ["manes-plate.png"] = "sm",
  ["manticore-plate.png"] = "md",
  ["mastodon-plate.png"] = "md",
  ["medusa-plate.png"] = "md",
  ["megalosaurus-plate.png"] = "sm",
  ["mephistopheles-plate.png"] = "lg",
  ["mephit-plate.png"] = "lg",
  ["mimic-plate.png"] = "sm",
  ["mind-flayer-plate.png"] = "sm",
  ["minotaur-plate.png"] = "md",
  ["mold-plate.png"] = "md",
  ["moloch-plate.png"] = "lg",
  ["morkoth-plate.png"] = "sm",
  ["mummy-plate.png"] = "md",
  ["myconid-plate.png"] = "lg",
  ["naga-plate.png"] = "md",
  ["neotyugh-plate.png"] = "sm",
  ["night-hag-plate.png"] = "sm",
  ["nightmare-plate.png"] = "sm",
  ["ochre-jelly-plate.png"] = "sm",
  ["octopus-plate.png"] = "md",
  ["ogre-mage-plate.png"] = "sm",
  ["ogre-plate.png"] = "sm",
  ["orc-plate.png"] = "sm",
  ["orcus-plate.png"] = "sm",
  ["otyugh-plate.png"] = "sm",
  ["owl-bear-plate.png"] = "md",
  ["paleoscincus-plate.png"] = "sm",
  ["pazuzu-plate.png"] = "md",
  ["pegasus-plate.png"] = "md",
  ["peryton-plate.png"] = "sm",
  ["piercer-plate.png"] = "sm",
  ["pit-fiend-plate.png"] = "sm",
  ["pixie-plate.png"] = "md",
  ["pseudo-dragon-plate.png"] = "sm",
  ["purple-worm-plate.png"] = "md",
  ["quasit-plate.png"] = "sm",
  ["rakshasa-plate.png"] = "sm",
  ["remorhaz-plate.png"] = "sm",
  ["revenant-plate.png"] = "md",
  ["roc-plate.png"] = "md",
  ["rock-baboon-plate.png"] = "md",
  ["roper-plate.png"] = "sm",
  ["rot-grub-plate.png"] = "lg",
  ["rust-monster-plate.png"] = "md",
  ["sabre-tooth-tiger-plate.png"] = "md",
  ["sahuagin-plate.png"] = "sm",
  ["salamander-plate.png"] = "md",
  ["satyr-plate.png"] = "sm",
  ["sea-hag-plate.png"] = "sm",
  ["sea-lion-plate.png"] = "sm",
  ["sea-serpent-plate.png"] = "md",
  ["shadow-demon-plate.png"] = "md",
  ["shambling-mound-plate.png"] = "sm",
  ["shark-plate.png"] = "md",
  ["shedu-plate.png"] = "sm",
  ["shrieker-plate.png"] = "sm",
  ["skeleton-plate.png"] = "md",
  ["skeleton-warrior-plate.png"] = "md",
  ["snake-plate.png"] = "md",
  ["spectre-plate.png"] = "md",
  ["sphinx-plate.png"] = "md",
  ["spider-generic-plate.png"] = "lg",
  ["spider-plate.png"] = "md",
  ["sprite-plate.png"] = "sm",
  ["squid-plate.png"] = "sm",
  ["stirge-plate.png"] = "sm",
  ["su-monster-plate.png"] = "sm",
  ["succubus-plate.png"] = "sm",
  ["svirfneblin-plate.png"] = "md",
  ["sylph-plate.png"] = "sm",
  ["termite-plate.png"] = "md",
  ["thought-eater-plate.png"] = "sm",
  ["tiamat-plate.png"] = "sm",
  ["titan-plate.png"] = "sm",
  ["titanothere-plate.png"] = "sm",
  ["titivilus-plate.png"] = "lg",
  ["toc-plate.png"] = "md",
  ["trapper-plate.png"] = "sm",
  ["treant-plate.png"] = "md",
  ["triton-plate.png"] = "sm",
  ["troglodyte-plate.png"] = "md",
  ["troll-plate.png"] = "sm",
  ["type-i-vrock-plate.png"] = "sm",
  ["type-ii-hezrou-plate.png"] = "sm",
  ["type-iii-glabrezu-plate.png"] = "sm",
  ["type-iv-nalfeshnee-plate.png"] = "sm",
  ["type-v-marilith-plate.png"] = "sm",
  ["type-vi-balor-plate.png"] = "sm",
  ["tyrannosaurus-rex-plate.png"] = "md",
  ["umber-hulk-plate.png"] = "sm",
  ["unicorn-plate.png"] = "md",
  ["vampire-plate.png"] = "md",
  ["violet-fungi-plate.png"] = "md",
  ["water-weird-plate.png"] = "sm",
  ["werebear-plate.png"] = "md",
  ["wereboar-plate.png"] = "md",
  ["wererat-plate.png"] = "md",
  ["wereshark-plate.png"] = "md",
  ["weretiger-plate.png"] = "md",
  ["werewolf-plate.png"] = "md",
  ["whale-plate.png"] = "md",
  ["white-ape-plate.png"] = "md",
  ["wight-plate.png"] = "sm",
  ["will-o-wisp-plate.png"] = "sm",
  ["wolf-plate.png"] = "md",
  ["wraith-plate.png"] = "sm",
  ["wyvern-plate.png"] = "md",
  ["xorn-plate.png"] = "sm",
  ["yeenoghu-plate.png"] = "sm",
  ["yellow-mold-plate.png"] = "md",
  ["yellow-musk-creeper-plate.png"] = "md",
  ["yeti-plate.png"] = "lg",
  ["zombie-plate.png"] = "md",
  ["zombie-yellow-musk-plate.png"] = "md",
}

function Image(el)
  if not FORMAT:match("html") then
    return el
  end

  local basename = el.src:match("([^/\\]+)$") or el.src
  local size_class = HTML_IMAGE_WIDTH_CLASS[basename]

  if size_class then
    el.classes = { "img-" .. size_class }
  end

  return el
end

function Pandoc(doc)
  local blocks = normalize_custom_statblocks(doc.blocks)

  if FORMAT:match("html") then
    return pandoc.Pandoc(blocks, doc.meta)
  end

  if FORMAT:match("latex") then
    local rebuilt = {}
    local twocolumn_blocks = nil
    local index_entries = {}
    local toc_entries = {}

    local function flush_twocolumn()
      if not twocolumn_blocks then
        return
      end

      local section_blocks, section_index_entries, section_toc_entries = process_two_column_section(twocolumn_blocks)

      for _, inner in ipairs(section_blocks) do
        table.insert(rebuilt, inner)
      end

      for _, entry in ipairs(section_index_entries) do
        table.insert(index_entries, entry)
      end

      for _, entry in ipairs(section_toc_entries) do
        table.insert(toc_entries, entry)
      end

      twocolumn_blocks = nil
    end

    for _, block in ipairs(blocks) do
      if is_pdf_twocolumn_begin_div(block) then
        flush_twocolumn()
        twocolumn_blocks = {}
      elseif is_pdf_twocolumn_end_div(block) then
        flush_twocolumn()
      elseif twocolumn_blocks then
        table.insert(twocolumn_blocks, block)
      elseif is_pdf_pagebreak_div(block) then
        for _, raw in ipairs(pagebreak_blocks(false)) do
          table.insert(rebuilt, raw)
        end
      elseif is_pdf_columnbreak_div(block) then
        for _, raw in ipairs(columnbreak_blocks(false)) do
          table.insert(rebuilt, raw)
        end
      elseif block.t == "Header" and block.level == 3 then
        local entry_id = header_identifier(block)
        table.insert(index_entries, { name = stringify(block.content), id = entry_id })
        for _, inner in ipairs(latex_blocks_for_block(block)) do
          table.insert(rebuilt, inner)
        end
        table.insert(rebuilt, pandoc.RawBlock("latex", "\\phantomsection\\label{" .. entry_label_name(entry_id) .. "}"))
      elseif block.t == "Header" and block.level <= 2 then
        -- See emit_chapter_heading_outside_columns for why this uses a
        -- manually-placed label (for the Contents section) rather than
        -- relying on native \tableofcontents linking.
        local chapter_id = header_identifier(block)
        for _, inner in ipairs(latex_blocks_for_block(block)) do
          table.insert(rebuilt, inner)
        end
        table.insert(rebuilt, pandoc.RawBlock("latex", "\\phantomsection\\label{" .. chapter_label_name(chapter_id) .. "}"))
        table.insert(toc_entries, { name = stringify(block.content), id = chapter_id })
      elseif block.t == "Table" then
        table.insert(rebuilt, table_to_tabularx(block, "\\textwidth"))
      elseif is_lair_treasure_table_div(block) and block.content[1] and block.content[1].t == "Table" then
        table.insert(rebuilt, treasure_table_to_tabularx(block.content[1], LAIR_TREASURE_HEADERS))
      elseif is_individual_treasure_table_div(block) and block.content[1] and block.content[1].t == "Table" then
        table.insert(rebuilt, treasure_table_to_tabularx(block.content[1], INDIVIDUAL_TREASURE_HEADERS))
      elseif is_unguarded_treasure_table_div(block) and block.content[1] and block.content[1].t == "Table" then
        table.insert(rebuilt, treasure_table_to_tabularx(block.content[1], UNGUARDED_TREASURE_HEADERS))
      else
        for _, inner in ipairs(latex_blocks_for_block(block)) do
          table.insert(rebuilt, inner)
        end
      end
    end

    flush_twocolumn()

    table.sort(index_entries, function(a, b)
      return sort_key(a.name) < sort_key(b.name)
    end)

    for _, block in ipairs(build_index_section(index_entries)) do
      table.insert(rebuilt, block)
    end

    if #index_entries > 0 then
      table.insert(toc_entries, { name = "Index", id = "index" })
    end

    local final = {}
    for _, block in ipairs(build_contents_section(toc_entries)) do
      table.insert(final, block)
    end
    for _, block in ipairs(rebuilt) do
      table.insert(final, block)
    end

    return pandoc.Pandoc(final, doc.meta)
  end

  return pandoc.Pandoc(blocks, doc.meta)
end
