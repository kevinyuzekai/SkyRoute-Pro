/* SkyRoute Pro — 航司涂装 (爱好者自制的配色还原, 仅颜色 + 简化几何垂尾标志, 不含任何航司商标图形;
   与相关航空公司无任何关联, 未获其授权或认可)。制造商原厂涂装沿用 config.js 中的 house-* 条目。 */
(function (global) {
  var FS = global.FS; if (!FS || !FS.LIVERIES) return;
  var A = ['A320neo', 'A320ceo', 'A321neo'], A3 = ['A330-300'], A35 = ['A350-900', 'A350-1000'], B7 = ['B737-800', 'B737-MAX8'], B77 = ['B777-300ER'], B78 = ['B787-9'];
  function L(id, name, types, body, belly, tail, stripe, accent, logo) { return { id: 'al-' + id, name: name + ' (爱好者涂装)', airline: true, types: types, body: body, belly: belly, tail: tail, stripe: stripe, accent: accent || tail, logo: logo || null }; }
  var AL = [
    L('ces', '中国东方航空', A.concat(A3, A35, B7, B77, B78, ['C919']), 0xf7f8fa, 0xe4e8ed, 0xffffff, 0x1d3a8a, 0xc8102e, 'disc:#c8102e:#1d3a8a'),
    L('cca', '中国国际航空', A.concat(A3, A35, B7, B77, B78, ['C919']), 0xf7f8fa, 0xe4e8ed, 0xffffff, 0x8a8f96, 0xd11f2f, 'ring:#d11f2f:#ffffff'),
    L('csn', '中国南方航空', A.concat(A3, A35, B7, B77, B78, ['C919']), 0xf7f8fa, 0xe4e8ed, 0x2f6db5, 0x2f6db5, 0x2f6db5, 'disc:#e03a3e'),
    L('chh', '海南航空', A.concat(A3, B7, B78), 0xf7f8fa, 0xe4e8ed, 0xc8102e, 0xd4a53a, 0xc8102e, 'ring:#d4a53a:#c8102e'),
    L('cpa', '国泰航空', A.concat(A3, A35, B77), 0xf2f4f3, 0xd5d9d6, 0x00645a, 0x00645a, 0x00645a, 'disc:#ffffff:#00645a'),
    L('sia', '新加坡航空', A35.concat(B77, B78, A3), 0xf7f8fa, 0xe4e8ed, 0x0a2240, 0xf2a900, 0x0a2240, 'disc:#f2a900:#0a2240'),
    L('dlh', '汉莎航空', A.concat(A3, A35, B7, B78), 0xf7f8fa, 0xe4e8ed, 0x05164d, 0x05164d, 0x05164d, 'ring:#ffad00:#05164d'),
    L('uae', '阿联酋航空', B77.concat(A35), 0xf7f8fa, 0xe4e8ed, 0xffffff, 0xd71921, 0xd71921, 'disc:#d71921:#00843d'),
    L('qtr', '卡塔尔航空', A.concat(A3, A35, B77, B78, B7), 0xf7f8fa, 0xe4e8ed, 0x5c0632, 0x8a8f96, 0x5c0632),
    L('ana', '全日空', A.concat(B7, B77, B78), 0xf7f8fa, 0xe4e8ed, 0x13448f, 0x13448f, 0x1fa0d8),
    L('jal', '日本航空', A35.concat(B7, B77, B78), 0xf7f8fa, 0xe4e8ed, 0xffffff, 0x9aa1a8, 0xcc0000, 'ring:#cc0000:#ffffff'),
    L('ual', '美国联合航空', A.concat(B7, B77, B78), 0xf7f8fa, 0x1a3a8f, 0x1a3a8f, 0x2d5fb5, 0x1a3a8f, 'disc:#ffffff:#1a3a8f'),
    L('dal', '达美航空', A.concat(A3, A35, B7), 0xf7f8fa, 0x0a2a5c, 0xc01933, 0x0a2a5c, 0xc01933),
    L('aal', '美国航空', A.concat(B7, B77, B78), 0xd9dde2, 0xb8bec5, 0x0b3d91, 0xc8102e, 0x0b3d91),
    L('baw', '英国航空', A.concat(A35, B77, B78), 0xf7f8fa, 0x1f2a5c, 0xffffff, 0xd2262f, 0x1f2a5c),
    L('afr', '法国航空', A.concat(A3, A35, B77, B78), 0xf7f8fa, 0xe4e8ed, 0xffffff, 0x002157, 0xe2001a),
    L('klm', '荷兰皇家航空', A3.concat(B7, B77, B78), 0x00a1de, 0xf2f4f6, 0x00a1de, 0x003b7e, 0x00a1de),
    L('ryr', '瑞安航空', B7, 0xf7f8fa, 0x073590, 0x073590, 0xf1c933, 0x073590, 'disc:#f1c933'),
    L('ezy', '易捷航空', A, 0xf7f8fa, 0xe4e8ed, 0xff6600, 0xff6600, 0xff6600),
    L('qfa', '澳洲航空', A3.concat(B7, B78), 0xf7f8fa, 0xe4e8ed, 0xe0001b, 0x8a8f96, 0xe0001b, 'disc:#ffffff'),
    L('thy', '土耳其航空', A.concat(A3, A35, B7, B77, B78), 0xf7f8fa, 0xe4e8ed, 0xc70a0c, 0xc70a0c, 0xc70a0c, 'ring:#ffffff:#c70a0c'),
    L('kal', '大韩航空', A3.concat(B7, B77, B78), 0x9fd3ef, 0xd7dadd, 0xffffff, 0x2a6ebb, 0x2a6ebb, 'disc:#d6202e:#00539b')
  ];
  FS.LIVERIES = FS.LIVERIES.concat(AL);
  FS.LIVERY_NOTE = '航司涂装为爱好者自制的配色还原, 与相关航空公司无任何关联, 未获其授权或认可; 所有商标归其各自所有者。';
})(typeof window !== 'undefined' ? window : this);
