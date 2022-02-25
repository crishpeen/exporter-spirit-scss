function getGradientAngle(from, to) {
  var deltaY = (to.y - from.y);
  var deltaX = (to.x - from.x);
  var radians = Math.atan2(deltaY, deltaX); 
  var result = radians * 180 / Math.PI; 
  result = result + 90; 
  return  ((result < 0) ? (360 + result) : result) % 360;
}

function printUnit(value, unit) {
  let result = value;
  if (value > 0) {
    if (unit === 'Pixels') {
      result = result + 'px';
    }
    if (unit === 'rem') {
      result = result + 'rem';
    }
  }
  return result;
}

function plural(name) {
  if (name === 'radius') {
    return 'radii';
  }
  return `${name}s`;
}

function singular(name) {
  if (name.slice(-1) === 's') {
    return name.replace(/.$/, '');
  }
  return name;
}



function formatColor(color) {
  const colorParts = color.match(/.{1,2}/g);
  let shortHex = true;
  colorParts.map((part) => {
    if (shortHex) {
      shortHex = /^(.)\1+$/.test(part);
    }
  });

  if (shortHex) {
    return `${color.substring(0, 1)}${color.substring(2, 3)}${color.substring(4, 5)}`;
  }

  return color;
}

function getColor(color) {
  if (color.a < 255) {
    return `#${color.hex}`;
  } else {
    return `#${formatColor(color.hex.substring(0, 6))}`;
  }
}

function printTypes(types, colors) {
  let result = '';
  Object.entries(types).forEach(([key, value]) => {
    result = `${result}\n$${colors ? `${key}-colors` : plural(key)}: (
${value.map((val) => `    ${val}: $${key}-${val},`).join('\n')}
) !default;\n`; 
  });
  return result;
}

function getWeight(name) {
  switch (name.toLowerCase().replace(/\W/g, '')) {
    case 'thin':
      return 100;
    case 'extralight':
      return 200;
    case 'light':
      return 300;
    case 'normal':
      return 400;
    case 'regular':
      return 400;
    case 'medium':
      return 500;
    case 'semibold':
      return 600;
    case 'bold':
      return 700;
    case 'extrabold':
      return 800;
    case 'black':
      return 900;
    case 'extrablack':
      return 950;
    default:
      return name;
  }
}

function generateVars(list, name, type) {
  let result = '';
  let num = 1;
  list.map((item) => {
    if (item === 0) {
      num = 0;
    }
    if (type === 'weight') {
      result = `${result}$${name}-${item}: ${getWeight(item)} !default;\n`;
    } else {
      result = `${result}$${name}-${num === 0 ? '0' : `${num}00`}: ${item} !default;\n`;
      num = num += 1;
    }
  });

  return result;
}

function cleanName(name) {
  return name.replace(/\s/g, '-').replace(/\//g, '-').replace(/\d+-/g, '').replace(/--+/g, '-').toLowerCase();
}

Pulsar.registerFunction("generateSimple", function(tokens, groups = {}, sortByNum = false, sortByValue = false) {
  tokens.sort((a, b) => {
    if (sortByNum) {
      const aNumMatch = a.name.match(/\d+$/);
      const bNumMatch = b.name.match(/\d+$/);

      if (aNumMatch && bNumMatch) {
        return aNumMatch[0] - bNumMatch[0];
      }
    }
    if (sortByValue) {
      return +a.value.text - +b.value.text;
    }
    let aCompare = a.name.toLowerCase();
    let bCompare = b.name.toLowerCase();
    if (a.origin && b.origin) {
      aCompare = a.origin.name.toLowerCase();
      bCompare = a.origin.name.toLowerCase();
    }
    return aCompare.localeCompare(bCompare);
  });
  const vars = [];
  let types = {};
  tokens.map((token) => {
    let name = cleanName(token.name)
    if (token.origin) {
      name = cleanName(token.origin.name)
    }
    let groupName = '';
    if (groups.length > 0) {
      groups.map((group) => {
        if (Object.values(group.tokenIds).indexOf(token.id) > -1 && group.isRoot == false) {
          groupName = singular(cleanName(group.name));
        }
      });
    }
    const split = name.split('-');
    const typeName = groupName === '' ? split[0] : groupName;
    const tokenNameWithouType = groupName === '' ? name.replace(`${split[0]}-`,'') : name.replace(`${groupName}-`,'');
    if (types[typeName] && types[typeName].length > 0) {
      types[typeName].push(tokenNameWithouType);
    } else {
      types[typeName] = [tokenNameWithouType];
    }
    let value = '';
    if (token.tokenType === 'Color') {
      value = getColor(token.value);
    } else if (token.tokenType === 'Radius') {
      value = printUnit(token.value.radius.measure, token.value.radius.unit);
    } else if (token.tokenType === 'GenericToken') {
      value = printUnit(token.value.text, 'Pixels');
    } else if (token.tokenType === 'Shadow') {
      value = `${printUnit(token.value.x.measure, token.value.x.unit)} ${printUnit(token.value.y.measure, token.value.y.unit)} ${printUnit(token.value.radius.measure, token.value.radius.unit)} ${printUnit(token.value.spread.measure, token.value.spread.unit)} ${getColor(token.value.color)}`;
    } else if(token.tokenType === 'Gradient') {
      let gradientType = 'linear-gradient';
      let gradientDirection = `${Math.round(getGradientAngle(token.value.from, token.value.to) * 100) / 100}deg`;
      if (token.value.type === 'Radial') {
        gradientType = 'radial-gradient';
        gradientDirection = 'circle at center';
      }
      value = `${gradientType}(${gradientDirection}, ${token.value.stops.map((stop) => `${getColor(stop.color)} ${(Math.round(stop.position * 10) / 10) * 100}%`).join(', ')})`;
    } else if (token.tokenType === 'Border') {
      token.properties.map((prop) => {
        if (prop.codeName === 'style' && prop.value.length > 0) {
          value = prop.value;
        } else {
          value = printUnit(token.value.width.measure, token.value.width.unit);
        }
      })
    } else {
      value = printUnit(token.value.measure, token.value.unit);
    }
    vars.push(`$${name}: ${value} !default;`);
  });

  const varsPrint = vars.join('\n');

  const typesPrint = tokens.length === 0 || tokens[0].tokenType === 'Border' ? '' : printTypes(types, tokens[0].tokenType === 'Color');
  return `${varsPrint}\n${typesPrint}`;
});

Pulsar.registerFunction("generateTypography", function(tokens = [], defaultFontSize) {
  const vars = [];
  // todo
  const fallback = ', sans-serif';
  tokens.map((token) => {   
    let name = token.name.replace(/\s/g, '-').toLowerCase();
    if (token.origin) {
      name = token.origin.name.replace(/\s/g, '-').replace(/\//g, '-').replace(/\d+-/g, '').replace(/--+/g, '-').toLowerCase();
    }
    const subfamily = token.value.font.subfamily.toLowerCase();
    const fontSize = printUnit(Math.round((token.value.fontSize.measure / defaultFontSize) * 1000) / 1000, 'rem');
    let fontStyle = 'normal';
    let fontWeight = 'normal';
    if (subfamily === 'italic') {
      fontStyle = 'italic';
    } else {
      fontWeight = subfamily;
    }
    const lineHeight = Math.round((token.value.lineHeight.measure / 100) * 1000) / 1000;
    const letterSpacing = printUnit(token.value.letterSpacing.measure, token.value.letterSpacing.unit);
    const paragraphIndent = printUnit(token.value.paragraphIndent.measure, token.value.paragraphIndent.unit);
    vars.push(`$${name}: (
    font-family: '${token.value.font.family}'${fallback},
    font-size: ${fontSize},
    font-style: ${fontStyle},
    font-weight: ${getWeight(fontWeight)},
    line-height: ${lineHeight},
    letter-spacing: ${letterSpacing},
    text-decoration: ${token.value.textDecoration.toLowerCase()},
    text-indent: ${paragraphIndent},
    text-transform: ${token.value.textCase === 'Original' ? 'none' : token.value.textCase.toLowerCase()},
) !default;\n`);
  });
  
  return vars.join('\n');
});
