@extends('layouts.admin')

@section('title')
    Firewall — {{ $node->name }}
@endsection

@section('content-header')
    <h1>{{ $node->name }}<small>nftables Firewall Manager</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.nodes') }}">Nodes</a></li>
        <li><a href="{{ route('admin.nodes.view', $node->id) }}">{{ $node->name }}</a></li>
        <li class="active">Firewall</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="nav-tabs-custom nav-tabs-floating">
            <ul class="nav nav-tabs">
                <li><a href="{{ route('admin.nodes.view', $node->id) }}">About</a></li>
                <li><a href="{{ route('admin.nodes.view.settings', $node->id) }}">Settings</a></li>
                <li><a href="{{ route('admin.nodes.view.configuration', $node->id) }}">Configuration</a></li>
                <li><a href="{{ route('admin.nodes.view.allocation', $node->id) }}">Allocation</a></li>
                <li><a href="{{ route('admin.nodes.view.servers', $node->id) }}">Servers</a></li>
                @if($liveNodeStatsEnabled)
                <li><a href="{{ route('admin.nodes.view.wings-stats', $node->id) }}">Wings Stats</a></li>
                @if($firewallManagementEnabled ?? false)
                <li class="active"><a href="{{ route('admin.nodes.view.firewall', $node->id) }}">Firewall</a></li>
                @endif
                @endif
                <li><a href="{{ route('admin.nodes.view.logs', $node->id) }}">Logs</a></li>
                <li><a href="{{ route('admin.nodes.view.backups', $node->id) }}">Backups</a></li>
            </ul>
        </div>
    </div>
</div>

{{-- Status bar --}}
<div class="row" id="fw-status-row">
    <div class="col-xs-12">
        <div class="alert alert-info" id="fw-status-msg" style="margin-bottom:0;">
            <i class="fa fa-refresh fa-spin"></i> Loading firewall rules…
        </div>
    </div>
</div>

<div id="fw-main" style="display:none; margin-top:14px;">

<datalist id="firewall-chains">
    <option value="input">
    <option value="forward">
    <option value="output">
    <option value="DOCKER-USER">
    <option value="DOCKER">
    <option value="PREROUTING">
    <option value="POSTROUTING">
</datalist>

{{-- ── Quick-Action Row ─────────────────────────────────────────────────── --}}
<div class="" style="margin-bottom:16px; display:flex; gap:12px; flex-wrap:wrap;">
    <div class="" style="gap:12px; display:flex; flex-wrap:wrap;">
        <div class="box box-warning" style="margin-bottom:0;">
            <div class="box-header with-border">
                <h3 class="box-title"><i class="fa fa-bolt"></i> Quick Port Action</h3>
            </div>
            <div class="box-body">
                <div class="form-inline">
                    <div class="form-group" style="margin-right:8px; margin-bottom:8px;">
                        <input type="number" id="qa-port" class="form-control input-sm" placeholder="Port" min="1" max="65535" style="width:90px;">
                    </div>
                    <div class="form-group" style="margin-right:8px; margin-bottom:8px;">
                        <select id="qa-proto" class="form-control input-sm">
                            <option value="tcp">TCP</option>
                            <option value="udp">UDP</option>
                            <option value="both">TCP+UDP</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-right:8px; margin-bottom:8px;">
                        <select id="qa-family" class="form-control input-sm">
                            <option value="inet">inet</option>
                            <option value="ip">ip (IPv4)</option>
                            <option value="ip6">ip6 (IPv6)</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-right:8px; margin-bottom:8px;">
                        <select id="qa-table" class="form-control input-sm" style="width:90px;">
                            <option value="filter">filter</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-right:8px; margin-bottom:8px;">
                        <input type="text" list="firewall-chains" id="qa-chain" class="form-control input-sm" style="width:110px;" value="" placeholder="Chain">
                    </div>
                    <div class="form-group" style="margin-bottom:8px;">
                        <div class="form-group" style="margin-bottom:8px;">
                        <button class="btn btn-danger btn-sm" onclick="quickPortAction('block')">
                        <i class="fa fa-ban"></i> Block
                    </button>
                    &nbsp;
                    <button class="btn btn-success btn-sm" onclick="quickPortAction('allow')">
                        <i class="fa fa-check"></i> Allow
                    </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="" style="width: 100%;">
        <div class="box box-default" style="margin-bottom:0;">
            <div class="box-header with-border">
                <h3 class="box-title"><i class="fa fa-plus-circle"></i> Add Custom Rule</h3>
                <div class="box-tools pull-right">
                    <button class="btn btn-box-tool" data-widget="collapse"><i class="fa fa-minus"></i></button>
                </div>
            </div>
            <div class="box-body">
                <div class="row">
                    <div class="col-sm-2">
                        <label class="control-label" style="font-size:12px;">Family</label>
                        <select id="add-family" class="form-control input-sm">
                            <option value="inet">inet</option>
                            <option value="ip">ip</option>
                            <option value="ip6">ip6</option>
                            <option value="arp">arp</option>
                            <option value="bridge">bridge</option>
                            <option value="netdev">netdev</option>
                        </select>
                    </div>
                    <div class="col-sm-2">
                        <label class="control-label" style="font-size:12px;">Table</label>
                        <input type="text" id="add-table" class="form-control input-sm" value="filter" placeholder="filter">
                    </div>
                    <div class="col-sm-2">
                        <label class="control-label" style="font-size:12px;">Chain</label>
                        <input type="text" list="firewall-chains" id="add-chain" class="form-control input-sm" value="" placeholder="input">
                    </div>
                    <div class="col-sm-4">
                        <label class="control-label" style="font-size:12px;">Rule Expression</label>
                        <input type="text" id="add-rule" class="form-control input-sm" placeholder="tcp dport 8080 drop">
                    </div>
                    <div class="col-sm-2" >
                        <label class="control-label hidden-xs">&nbsp;</label>
                        <button class="btn btn-primary btn-sm btn-block" onclick="addRule()">
                            <i class="fa fa-plus"></i> Add Rule
                        </button>
                    </div>
                </div>
                <div style="margin-top:6px; font-size:11px; color:#888;">
                    Examples: <code>tcp dport 22 accept</code> &nbsp;·&nbsp;
                    <code>ip saddr 1.2.3.4 drop</code> &nbsp;·&nbsp;
                    <code>tcp dport { 80, 443 } accept</code>
                </div>
            </div>
        </div>
    </div>
</div>

{{-- ── Allow Specific IP on Specific Port ──────────────────────────────── --}}
<div class="" style="margin-bottom:16px; width: 100%;">
    <div class="">
        <div class="box box-success" style="margin-bottom:0;">
            <div class="box-header with-border">
                <h3 class="box-title"><i class="fa fa-user-plus"></i> Allow Specific IP on Specific Port</h3>
                <div class="box-tools pull-right">
                    <button class="btn btn-box-tool" data-widget="collapse"><i class="fa fa-minus"></i></button>
                </div>
            </div>
            <div class="box-body">
                <div class="row">
                    <div class="col-sm-3">
                        <label class="control-label" style="font-size:12px;">IP / CIDR</label>
                        <input type="text" id="allow-ip" class="form-control input-sm" placeholder="1.2.3.4 or 1.2.3.0/24 or 2001:db8::1">
                    </div>
                    <div class="col-sm-2">
                        <label class="control-label" style="font-size:12px;">Port</label>
                        <input type="number" id="allow-port" class="form-control input-sm" min="1" max="65535" placeholder="25565">
                    </div>
                    <div class="col-sm-2">
                        <label class="control-label" style="font-size:12px;">Protocol</label>
                        <select id="allow-proto" class="form-control input-sm">
                            <option value="tcp">TCP</option>
                            <option value="udp">UDP</option>
                            <option value="both">TCP+UDP</option>
                        </select>
                    </div>
                    <div class="col-sm-1">
                        <label class="control-label" style="font-size:12px;">Family</label>
                        <select id="allow-family" class="form-control input-sm">
                            <option value="inet">inet</option>
                            <option value="ip">ip</option>
                            <option value="ip6">ip6</option>
                        </select>
                    </div>
                    <div class="col-sm-2">
                        <label class="control-label" style="font-size:12px;">Table</label>
                        <input type="text" id="allow-table" class="form-control input-sm" value="filter" placeholder="filter">
                    </div>
                    <div class="col-sm-1">
                        <label class="control-label" style="font-size:12px;">Chain</label>
                        <input type="text" list="firewall-chains" id="allow-chain" class="form-control input-sm" value="" placeholder="input">
                    </div>
                    <div class="col-sm-1" >
                        <label class="control-label hidden-xs">&nbsp;</label>
                        <button class="btn btn-success btn-sm btn-block" onclick="allowSpecificIPPort()">
                            <i class="fa fa-check"></i> Allow
                        </button>
                    </div>
                </div>
                <div style="margin-top:7px; color:#6b6b6b; font-size:11px;">
                    This creates nft rules like:
                    <code>ip saddr 1.2.3.4 tcp dport 25565 accept</code>
                    or
                    <code>ip6 saddr 2001:db8::1 tcp dport 25565 accept</code>.
                </div>
            </div>
        </div>
    </div>
</div>

{{-- ── Block All + Whitelist IP (Specific Port) ───────────────────────── --}}
<div class="" style="margin-bottom:16px; display:flex; gap:12px; flex-wrap:wrap; width: 100%;">
    <div class="" style="display:flex; gap:12px; flex-wrap:wrap; width: 100%;">
        <div class="box box-danger" style="margin-bottom:0;">
            <div class="box-header with-border">
                <h3 class="box-title"><i class="fa fa-lock"></i> Block All + Whitelist IP (Port)</h3>
            </div>
            <div class="box-body">
                <div class="row">
                    <div class="col-sm-3">
                        <label class="control-label" style="font-size:12px;">Allowed IP / CIDR</label>
                        <input type="text" id="bw-ip" class="form-control input-sm" placeholder="1.2.3.4 or 1.2.3.0/24">
                    </div>
                    <div class="col-sm-2">
                        <label class="control-label" style="font-size:12px;">Port</label>
                        <input type="number" id="bw-port" class="form-control input-sm" min="1" max="65535" placeholder="25565">
                    </div>
                    <div class="col-sm-2">
                        <label class="control-label" style="font-size:12px;">Protocol</label>
                        <select id="bw-proto" class="form-control input-sm">
                            <option value="tcp">TCP</option>
                            <option value="udp">UDP</option>
                            <option value="both">TCP+UDP</option>
                        </select>
                    </div>
                    <div class="col-sm-1">
                        <label class="control-label" style="font-size:12px;">Family</label>
                        <select id="bw-family" class="form-control input-sm">
                            <option value="inet">inet</option>
                            <option value="ip">ip</option>
                            <option value="ip6">ip6</option>
                        </select>
                    </div>
                    <div class="col-sm-2">
                        <label class="control-label" style="font-size:12px;">Table</label>
                        <input type="text" id="bw-table" class="form-control input-sm" value="filter" placeholder="filter">
                    </div>
                    <div class="col-sm-1">
                        <label class="control-label" style="font-size:12px;">Chain</label>
                        <input type="text" list="firewall-chains" id="bw-chain" class="form-control input-sm" value="" placeholder="input">
                    </div>
                    <div class="col-sm-1" >
                        <label class="control-label hidden-xs">&nbsp;</label>
                        <button class="btn btn-danger btn-sm btn-block" onclick="blockAllWhitelistIPPort()">
                            <i class="fa fa-shield"></i> Apply
                        </button>
                    </div>
                </div>
                <div style="margin-top:7px; color:#666; font-size:11px;">
                    Adds rules in correct order: <code>allow selected IP</code> first, then <code>drop all other traffic</code> for that port.
                </div>
            </div>
        </div>
    </div>

    <div class="" style="width: 100%;">
        <div class="box box-default" style="margin-bottom:0;">
            <div class="box-header with-border">
                <h3 class="box-title"><i class="fa fa-undo"></i> Reset Rules for Specific Port</h3>
            </div>
            <div class="box-body">
                <div class="row">
                    <div class="col-sm-3">
                        <label class="control-label" style="font-size:12px;">Port</label>
                        <input type="number" id="reset-port" class="form-control input-sm" min="1" max="65535" placeholder="25565">
                    </div>
                    <div class="col-sm-2">
                        <label class="control-label" style="font-size:12px;">Proto</label>
                        <select id="reset-proto" class="form-control input-sm">
                            <option value="both">Both</option>
                            <option value="tcp">TCP</option>
                            <option value="udp">UDP</option>
                        </select>
                    </div>
                    <div class="col-sm-2">
                        <label class="control-label" style="font-size:12px;">Family</label>
                        <select id="reset-family" class="form-control input-sm">
                            <option value="inet">inet</option>
                            <option value="ip">ip</option>
                            <option value="ip6">ip6</option>
                        </select>
                    </div>
                    <div class="col-sm-2">
                        <label class="control-label" style="font-size:12px;">Table</label>
                        <input type="text" id="reset-table" class="form-control input-sm" value="filter" placeholder="filter">
                    </div>
                    <div class="col-sm-2">
                        <label class="control-label" style="font-size:12px;">Chain</label>
                        <input type="text" list="firewall-chains" id="reset-chain" class="form-control input-sm" value="" placeholder="input">
                    </div>
                    <div class="col-sm-1" >
                        <label class="control-label hidden-xs">&nbsp;</label>
                        <button class="btn btn-warning btn-sm btn-block" onclick="resetPortRules()">
                            <i class="fa fa-eraser"></i>
                            RESET
                        </button>
                    </div>
                </div>
                <div style="margin-top:12px;">
                    <label for="reset-managed-only" style="font-size:12px; color:#666; font-weight:normal; cursor:pointer;">
                        <input type="checkbox" id="reset-managed-only" checked style="vertical-align:middle; margin:0 4px 0 0;">
                        Only remove rules created by this Firewall Manager (recommended for Docker/Wings safety)
                    </label>
                </div>
            </div>
        </div>
    </div>
</div>

{{-- ── Port Rule Lookup ──────────────────────────────────────────────────── --}}
<div class="" style="margin-bottom:16px;">
    <div class="">
        <div class="box box-info" style="margin-bottom:0;">
            <div class="box-header with-border">
                <h3 class="box-title"><i class="fa fa-search"></i> Lookup Rules by Port</h3>
                <div class="box-tools pull-right">
                    <button class="btn btn-box-tool" data-widget="collapse"><i class="fa fa-minus"></i></button>
                </div>
            </div>
            <div class="box-body">
                <div class="form-inline">
                    <input type="number" id="lookup-port" class="form-control input-sm" placeholder="Port number" min="1" max="65535" style="width:130px;">
                    <button class="btn btn-info btn-sm" style="margin-left:8px;" onclick="lookupPort()">
                        <i class="fa fa-search"></i> Lookup
                    </button>
                </div>
                <div id="port-lookup-result" style="margin-top:10px; display:none;">
                    <table class="table table-condensed table-hover" style="font-size:12px; margin-bottom:0;">
                        <thead><tr>
                            <th style="width:60px;">Handle</th>
                            <th style="width:80px;">Family</th>
                            <th style="width:100px;">Table</th>
                            <th style="width:100px;">Chain</th>
                            <th>Expression</th>
                            <th style="width:100px;">Priority</th>
                            <th style="width:60px;">Action</th>
                        </tr></thead>
                        <tbody id="port-lookup-tbody"></tbody>
                    </table>
                    <p id="port-lookup-empty" style="color:#888; display:none; margin-top:8px;">No rules reference this port.</p>
                </div>
            </div>
        </div>
    </div>
</div>

{{-- ── Ruleset Tabs ──────────────────────────────────────────────────────── --}}
<div class="" style="width: 100%;">
    <div class="" style="width: 100%;">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title"><i class="fa fa-shield"></i> Live Ruleset</h3>
                <div class="box-tools pull-right">
                    <button class="btn btn-default btn-xs" onclick="loadRules()" title="Refresh">
                        <i class="fa fa-refresh" id="reload-icon"></i> Refresh
                    </button>
                    &nbsp;
                    <button class="btn btn-default btn-xs" onclick="toggleRawView()" title="Toggle raw">
                        <i class="fa fa-code"></i> Raw
                    </button>
                </div>
            </div>
            <div class="box-body" style="padding:0;">

                {{-- Raw view --}}
                <div id="raw-view" style="display:none; padding:12px;">
                    <pre id="raw-text" style="font-size:12px; max-height:500px; overflow:auto; background:#1a1a1a; color:#e0e0e0; padding:12px; border-radius:4px;"></pre>
                </div>

                {{-- Structured view --}}
                <div id="structured-view">
                    <div id="fw-tables-container"></div>
                    <p id="fw-no-nft" style="display:none; padding:20px; color:#888; text-align:center;">
                        <i class="fa fa-exclamation-triangle text-warning"></i>
                        nftables is not installed or the agent cannot run <code>nft</code> on this node.
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>

</div>{{-- /fw-main --}}

{{-- ── Confirmation Modal ────────────────────────────────────────────────── --}}
<div class="modal fade" id="confirm-modal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-sm" role="document">
        <div class="modal-content">
            <div class="modal-header" style="background:#d9534f; color:#fff;">
                <h4 class="modal-title"><i class="fa fa-trash"></i> Delete Rule</h4>
            </div>
            <div class="modal-body">
                <p>Delete rule <strong id="conf-handle"></strong> from chain <strong id="conf-chain"></strong>?</p>
                <p id="conf-expr" style="font-family:monospace; font-size:12px; color:#888;"></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" id="conf-ok-btn">Delete</button>
            </div>
        </div>
    </div>
</div>

{{-- ── Flush Confirmation Modal ──────────────────────────────────────────── --}}
<div class="modal fade" id="flush-modal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-sm" role="document">
        <div class="modal-content">
            <div class="modal-header" style="background:#d9534f; color:#fff;">
                <h4 class="modal-title"><i class="fa fa-exclamation-triangle"></i> Flush Rules</h4>
            </div>
            <div class="modal-body">
                <p>This will remove <strong>all rules</strong> from chain <strong id="flush-chain-name"></strong>.</p>
                <p class="text-danger"><strong>This cannot be undone.</strong></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" id="flush-ok-btn">Flush Chain</button>
            </div>
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
@parent
<style>
/* ─── Firewall page styles ──────────────────────────────────────────────── */
#fw-tables-container .fw-table-section { margin-bottom: 0; border-bottom: 1px solid #ddd; }
#fw-tables-container .fw-table-section:last-child { border-bottom: none; }
#fw-tables-container .fw-table-header {
    padding: 8px 14px; background: #18232f; color: #dce8f5; font-weight: 700; font-size: 13px;
    display: flex; align-items: center; gap: 10px;
}
#fw-tables-container .fw-chain-block { border-top: 1px solid #23384d; }
#fw-tables-container .fw-chain-header {
    padding: 6px 14px 6px 28px; background: #1f2f3f; color: #d3e3f3; font-size: 12px;
    display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;
}
#fw-tables-container .fw-chain-header:hover { background: #274157; }
#fw-tables-container .fw-rules-table { width: 100%; font-size: 12px; }
#fw-tables-container .fw-rules-table th {
    background: #223749; padding: 5px 10px; font-weight: 700; color: #cfe4f6;
    border-bottom: 1px solid #2b465d;
}
#fw-tables-container .fw-rules-table td {
    padding: 6px 10px; border-bottom: 1px solid #263b50; vertical-align: middle;
    color: #d9e7f5; background: #1b2a39;
}
#fw-tables-container .fw-rules-table tr:nth-child(even) td { background: #203245; }
#fw-tables-container .fw-rules-table tr:last-child td { border-bottom: none; }
#fw-tables-container .fw-rules-table tr:hover td { background: #29435b; }
#fw-tables-container .fw-rules-table code { color: #dce9f7; background: #30485e; }
#port-lookup-result table thead th { background: #223749; color: #cfe4f6; }
#port-lookup-result table tbody td { background: #1b2a39; color: #d9e7f5; }
#port-lookup-result table tbody tr:nth-child(even) td { background: #203245; }
#port-lookup-result table tbody tr:hover td { background: #29435b; }
.fw-rule-expr { font-family: monospace; font-size: 11px; color: #d9e7f5; }
.badge-family { background:#5bc0de; font-size:10px; }
.badge-type   { background:#777;    font-size:10px; }
.badge-hook   { background:#f0ad4e; color:#333; font-size:10px; }
.badge-policy-accept { background:#5cb85c; font-size:10px; }
.badge-policy-drop   { background:#d9534f; font-size:10px; }
.badge-policy-reject { background:#d9534f; font-size:10px; }
.rule-verdict-drop   { color: #d9534f; font-weight: bold; }
.rule-verdict-accept { color: #5cb85c; font-weight: bold; }
.rule-verdict-reject { color: #e67e22; font-weight: bold; }
.empty-chain-msg { padding: 8px 28px; color: #aaa; font-style: italic; font-size: 11px; }
</style>

<script>
var nodeId      = {{ $node->id }};
var ticketUrl   = '{{ route('admin.nodes.wings-agent.ticket', $node->id) }}';

var agentBaseUrl = '';
var agentTicket  = '';

function fetchTicket() {
    return fetch(ticketUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            agentBaseUrl = d.base_url;
            agentTicket  = d.ticket;
        });
}

function agentGet(path) {
    return fetch(agentBaseUrl + path, {
        headers: { 'Authorization': 'Bearer ' + agentTicket }
    }).then(function(r) { return r.json(); });
}

function agentPost(path, body) {
    return fetch(agentBaseUrl + path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + agentTicket,
        },
        body: JSON.stringify(body),
    }).then(function(r) { return r.json(); });
}

var cachedRuleset = null;
var rawVisible    = false;

// ── Fetch & render ──────────────────────────────────────────────────────────

function loadRules() {
    document.getElementById('reload-icon').classList.add('fa-spin');
    setStatus('info', '<i class="fa fa-refresh fa-spin"></i> Loading firewall rules…');

    agentGet('/firewall/rules')
        .then(data => {
            document.getElementById('reload-icon').classList.remove('fa-spin');
            document.getElementById('fw-main').style.display = '';
            document.getElementById('fw-status-row').style.display = 'none';
            cachedRuleset = data;

            document.getElementById('raw-text').textContent = data.raw || '(empty)';

            if (!data.nft_available) {
                document.getElementById('fw-tables-container').innerHTML = '';
                document.getElementById('fw-no-nft').style.display = '';
            } else {
                document.getElementById('fw-no-nft').style.display = 'none';
                renderRuleset(data.tables || []);
                populateTableDropdown(data.tables || []);
            }
        })
        .catch(err => {
            document.getElementById('reload-icon').classList.remove('fa-spin');
            setStatus('danger', '<i class="fa fa-times"></i> Failed to load: ' + err.message);
        });
}

function renderRuleset(tables) {
    var container = document.getElementById('fw-tables-container');
    if (!tables || tables.length === 0) {
        container.innerHTML = '<p style="padding:20px; color:#aaa; text-align:center;">No tables found. nftables ruleset is empty.</p>';
        return;
    }

    var html = '';
    tables.forEach(function(tbl) {
        var chains = tbl.chains || [];
        var totalRules = chains.reduce(function(sum, c) { return sum + (c.rules || []).length; }, 0);

        html += '<div class="fw-table-section">';
        html += '<div class="fw-table-header">';
        html += '<i class="fa fa-table text-primary"></i>';
        html += '<strong>' + escHtml(tbl.name) + '</strong>';
        html += '<span class="badge badge-family">' + escHtml(tbl.family) + '</span>';
        html += '<span style="color:#999; font-weight:normal; font-size:11px;">'
              + chains.length + ' chain(s) · ' + totalRules + ' rule(s)</span>';
        html += '</div>';

        chains.forEach(function(chain) {
            var chainId = 'chain-' + tbl.family + '-' + tbl.name + '-' + chain.name;
            var rules = chain.rules || [];

            html += '<div class="fw-chain-block">';
            html += '<div class="fw-chain-header" onclick="toggleChain(\'' + chainId + '\')">';
            html += '<i class="fa fa-link" style="color:#999;"></i>';
            html += '<strong style="font-size:12px;">' + escHtml(chain.name) + '</strong>';
            if (chain.type)   html += '<span class="badge badge-type">' + escHtml(chain.type) + '</span>';
            if (chain.hook)   html += '<span class="badge badge-hook">hook: ' + escHtml(chain.hook) + '</span>';
            if (chain.policy) {
                var polClass = 'badge-policy-' + chain.policy.toLowerCase();
                html += '<span class="badge ' + polClass + '">policy: ' + escHtml(chain.policy) + '</span>';
            }
            html += '<span style="color:#999; font-size:11px; margin-left:4px;">'
                  + rules.length + ' rule(s)</span>';
            html += '<button class="btn btn-xs btn-danger pull-right" style="margin-left:8px;" '
                  + 'title="Flush chain" '
                  + 'onclick="event.stopPropagation(); confirmFlush('
                  + JSON.stringify(tbl.family).replace(/"/g, '&quot;') + ','
                  + JSON.stringify(tbl.name).replace(/"/g, '&quot;') + ','
                  + JSON.stringify(chain.name).replace(/"/g, '&quot;') + ')">'
                  + '<i class="fa fa-trash"></i> Flush</button>';
            html += '</div>';

            html += '<div id="' + chainId + '">';
            if (rules.length === 0) {
                html += '<div class="empty-chain-msg">No rules in this chain.</div>';
            } else {
                html += '<table class="fw-rules-table">';
                html += '<thead><tr>'
                      + '<th style="width:60px;">Handle</th>'
                      + '<th>Expression</th>'
                      + '<th style="width:80px;">Action</th>'
                      + '</tr></thead><tbody>';

                rules.forEach(function(rule) {
                    var verdict = detectVerdict(rule.expr);
                    html += '<tr>';
                    html += '<td><code style="font-size:11px;">#' + rule.handle + '</code></td>';
                    html += '<td class="fw-rule-expr">' + colorizeExpr(escHtml(rule.expr)) + '</td>';
                    html += '<td>'
                          + '<button class="btn btn-xs btn-danger" '
                          + 'onclick="confirmDelete('
                          + rule.handle + ','
                          + JSON.stringify(tbl.family).replace(/"/g, '&quot;') + ','
                          + JSON.stringify(tbl.name).replace(/"/g, '&quot;') + ','
                          + JSON.stringify(chain.name).replace(/"/g, '&quot;') + ','
                          + JSON.stringify(rule.expr).replace(/"/g, '&quot;') + ')">'
                          + '<i class="fa fa-trash"></i></button>'
                          + '</td>';
                    html += '</tr>';
                });

                html += '</tbody></table>';
            }
            html += '</div>';
            html += '</div>';
        });

        html += '</div>';
    });

    container.innerHTML = html;
}

function populateTableDropdown(tables) {
    var sel = document.getElementById('qa-table');
    var allowSel = document.getElementById('allow-table');
    var bwSel = document.getElementById('bw-table');
    var resetSel = document.getElementById('reset-table');

    sel.innerHTML = '';
    allowSel.innerHTML = '';
    bwSel.innerHTML = '';
    resetSel.innerHTML = '';
    var seen = {};
    tables.forEach(function(t) {
        if (!seen[t.name]) {
            seen[t.name] = true;
            var opt = document.createElement('option');
            opt.value = t.name;
            opt.textContent = t.name;
            sel.appendChild(opt);

            var opt2 = document.createElement('option');
            opt2.value = t.name;
            opt2.textContent = t.name;
            allowSel.appendChild(opt2);

            var opt3 = document.createElement('option');
            opt3.value = t.name;
            opt3.textContent = t.name;
            bwSel.appendChild(opt3);

            var opt4 = document.createElement('option');
            opt4.value = t.name;
            opt4.textContent = t.name;
            resetSel.appendChild(opt4);
        }
    });
    if (sel.options.length === 0) {
        sel.innerHTML = '<option value="filter">filter</option>';
        allowSel.innerHTML = '<option value="filter">filter</option>';
        bwSel.innerHTML = '<option value="filter">filter</option>';
        resetSel.innerHTML = '<option value="filter">filter</option>';
    }
}

function resolveTargetForRequest(family, table, chain) {
    var fam = String(family || '').trim().toLowerCase();
    var tbl = String(table || '').trim();
    var chn = String(chain || '').trim();
    var tables = (cachedRuleset && cachedRuleset.tables) ? cachedRuleset.tables : [];

    if (!tbl || !chn || !tables.length) {
        return { family: fam || 'inet', table: tbl, chain: chn, resolved: false };
    }

    var exactFound = tables.some(function(t) {
        if (String(t.family) !== fam || String(t.name) !== tbl) return false;
        return (t.chains || []).some(function(c) { return String(c.name) === chn; });
    });
    if (exactFound) {
        return { family: fam, table: tbl, chain: chn, resolved: false };
    }

    var chainFamilies = [];
    tables.forEach(function(t) {
        if (String(t.name) !== tbl) return;
        var hasChain = (t.chains || []).some(function(c) { return String(c.name) === chn; });
        if (hasChain && chainFamilies.indexOf(String(t.family)) === -1) {
            chainFamilies.push(String(t.family));
        }
    });

    if (chainFamilies.length === 1) {
        return { family: chainFamilies[0], table: tbl, chain: chn, resolved: chainFamilies[0] !== fam };
    }

    var tableFamilies = [];
    tables.forEach(function(t) {
        if (String(t.name) === tbl && tableFamilies.indexOf(String(t.family)) === -1) {
            tableFamilies.push(String(t.family));
        }
    });
    if (tableFamilies.length === 1) {
        return { family: tableFamilies[0], table: tbl, chain: chn, resolved: tableFamilies[0] !== fam };
    }

    return { family: fam || 'inet', table: tbl, chain: chn, resolved: false };
}

function toggleChain(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = (el.style.display === 'none') ? '' : 'none';
}

function toggleRawView() {
    rawVisible = !rawVisible;
    document.getElementById('raw-view').style.display       = rawVisible ? '' : 'none';
    document.getElementById('structured-view').style.display = rawVisible ? 'none' : '';
}

// ── Add Rule ────────────────────────────────────────────────────────────────

function addRule() {
    var family = document.getElementById('add-family').value.trim();
    var table  = document.getElementById('add-table').value.trim();
    var chain  = document.getElementById('add-chain').value.trim();
    var rule   = document.getElementById('add-rule').value.trim();

    if (!table || !chain || !rule) {
        alert('Please fill in table, chain, and rule expression.');
        return;
    }

    setStatus('info', '<i class="fa fa-spinner fa-spin"></i> Adding rule…');

    var target = resolveTargetForRequest(family, table, chain);

    postJSON('/firewall/rule/add', { family: target.family, table: target.table, chain: target.chain, rule: rule })
        .then(function(data) {
            if (data.error) {
                setStatus('danger', '<i class="fa fa-times"></i> Error: ' + data.error);
            } else {
                document.getElementById('add-rule').value = '';
                var msg = target.resolved
                    ? ('Rule added successfully (resolved family to <code>' + escHtml(target.family) + '</code>).')
                    : 'Rule added successfully.';
                setStatus('success', '<i class="fa fa-check"></i> ' + msg);
                loadRules();
            }
        })
        .catch(function(e) { setStatus('danger', 'Request failed: ' + e.message); });
}

// ── Delete Rule ─────────────────────────────────────────────────────────────

var pendingDelete = null;

function confirmDelete(handle, family, table, chain, expr) {
    pendingDelete = { handle: handle, family: family, table: table, chain: chain };
    document.getElementById('conf-handle').textContent = '#' + handle;
    document.getElementById('conf-chain').textContent  = family + ' ' + table + ' ' + chain;
    document.getElementById('conf-expr').textContent   = expr;
    $('#confirm-modal').modal('show');
}

document.getElementById('conf-ok-btn').addEventListener('click', function() {
    if (!pendingDelete) return;
    $('#confirm-modal').modal('hide');
    setStatus('info', '<i class="fa fa-spinner fa-spin"></i> Deleting rule…');

    postJSON('/firewall/rule/delete', pendingDelete)
        .then(function(data) {
            pendingDelete = null;
            if (data.error) {
                setStatus('danger', '<i class="fa fa-times"></i> Error: ' + data.error);
            } else {
                setStatus('success', '<i class="fa fa-check"></i> Rule deleted.');
                loadRules();
            }
        })
        .catch(function(e) { setStatus('danger', 'Request failed: ' + e.message); });
});

// ── Flush Chain ─────────────────────────────────────────────────────────────

var pendingFlush = null;

function confirmFlush(family, table, chain) {
    pendingFlush = { family: family, table: table, chain: chain };
    document.getElementById('flush-chain-name').textContent = family + ' ' + table + ' ' + chain;
    $('#flush-modal').modal('show');
}

document.getElementById('flush-ok-btn').addEventListener('click', function() {
    if (!pendingFlush) return;
    $('#flush-modal').modal('hide');
    setStatus('info', '<i class="fa fa-spinner fa-spin"></i> Flushing chain…');

    postJSON('/firewall/flush', pendingFlush)
        .then(function(data) {
            pendingFlush = null;
            if (data.error) {
                setStatus('danger', '<i class="fa fa-times"></i> Error: ' + data.error);
            } else {
                setStatus('success', '<i class="fa fa-check"></i> Chain flushed.');
                loadRules();
            }
        })
        .catch(function(e) { setStatus('danger', 'Request failed: ' + e.message); });
});

// ── Quick Port Action ────────────────────────────────────────────────────────

function quickPortAction(action) {
    var port   = parseInt(document.getElementById('qa-port').value, 10);
    var proto  = document.getElementById('qa-proto').value;
    var family = document.getElementById('qa-family').value;
    var table  = document.getElementById('qa-table').value;
    var chain  = document.getElementById('qa-chain').value;

    if (!port || port < 1 || port > 65535) {
        alert('Enter a valid port number (1–65535).');
        return;
    }

    var url = '/firewall/port/' + port + '/' + action;
    setStatus('info', '<i class="fa fa-spinner fa-spin"></i> Applying port ' + action + ' for port ' + port + '…');

    var target = resolveTargetForRequest(family, table, chain);

    postJSON(url, { protocol: proto, family: target.family, table: target.table, chain: target.chain })
        .then(function(data) {
            if (data.error) {
                setStatus('danger', '<i class="fa fa-times"></i> Error: ' + data.error);
            } else {
                var verb = action === 'block' ? 'blocked' : 'allowed';
                var details = target.resolved ? (' (resolved family to ' + target.family + ')') : '';
                setStatus('success', '<i class="fa fa-check"></i> Port ' + port + ' (' + proto + ') ' + verb + ' successfully' + details + '.');
                loadRules();
            }
        })
        .catch(function(e) { setStatus('danger', 'Request failed: ' + e.message); });
}

// ── Allow Specific IP on Specific Port ─────────────────────────────────────

function allowSpecificIPPort() {
    var ipRaw   = document.getElementById('allow-ip').value.trim();
    var port    = parseInt(document.getElementById('allow-port').value, 10);
    var proto   = document.getElementById('allow-proto').value;
    var family  = document.getElementById('allow-family').value.trim();
    var table   = document.getElementById('allow-table').value.trim();
    var chain   = document.getElementById('allow-chain').value.trim();

    if (!ipRaw) {
        alert('Enter an IP or CIDR.');
        return;
    }
    if (!port || port < 1 || port > 65535) {
        alert('Enter a valid port number (1–65535).');
        return;
    }
    if (!table || !chain) {
        alert('Table and chain are required.');
        return;
    }

    var isV6 = ipRaw.indexOf(':') !== -1;
    var addrPrefix = isV6 ? 'ip6 saddr ' : 'ip saddr ';
    var protos = (proto === 'both') ? ['tcp', 'udp'] : [proto];
    var target = resolveTargetForRequest(family, table, chain);

    var tag = 'wings-fw-port-' + port;

    setStatus('info', '<i class="fa fa-spinner fa-spin"></i> Looking up existing rules for port ' + port + '…');

    // Look up existing rules first — insert BEFORE any existing block-all rule so the allow wins
    agentGet('/firewall/port/' + port)
        .then(function(data) {
            var existingRules = data.rules || [];
            var blockallRule = existingRules.find(function(r) {
                return String(r.family) === target.family &&
                       String(r.table)  === target.table  &&
                       String(r.chain)  === target.chain  &&
                       String(r.expr || '').toLowerCase().indexOf(tag.toLowerCase() + '-blockall') !== -1;
            });

            setStatus('info', '<i class="fa fa-spinner fa-spin"></i> Creating allow rule for ' + ipRaw + ' on port ' + port + '…');

            var promises = protos.map(function(p) {
                var ruleExpr = addrPrefix + ipRaw + ' ' + p + ' dport ' + port + ' accept comment "' + tag + '-allow"';
                var payload = { family: target.family, table: target.table, chain: target.chain, rule: ruleExpr };
                if (blockallRule) {
                    payload.position = String(blockallRule.handle); // insert BEFORE the block-all rule
                }
                return postJSON('/firewall/rule/add', payload);
            });

            Promise.all(promises)
                .then(function(results) {
                    var err = results.find(function(r) { return r && r.error; });
                    if (err) { setStatus('danger', '<i class="fa fa-times"></i> Error: ' + err.error); return; }
                    var note = blockallRule ? ' (inserted before block-all rule)' : (target.resolved ? ' (resolved family to ' + target.family + ')' : '');
                    setStatus('success', '<i class="fa fa-check"></i> Allow rule added for ' + ipRaw + ' on port ' + port + note + '.');
                    loadRules();
                })
                .catch(function(e) { setStatus('danger', 'Request failed: ' + e.message); });
        })
        .catch(function(e) { setStatus('danger', 'Lookup failed: ' + e.message); });
}

// ── Block All + Whitelist IP on Port ─────────────────────────────────────

function blockAllWhitelistIPPort() {
    var ipRaw   = document.getElementById('bw-ip').value.trim();
    var port    = parseInt(document.getElementById('bw-port').value, 10);
    var proto   = document.getElementById('bw-proto').value;
    var family  = document.getElementById('bw-family').value.trim();
    var table   = document.getElementById('bw-table').value.trim();
    var chain   = document.getElementById('bw-chain').value.trim();

    if (!ipRaw) {
        alert('Enter an allowed IP or CIDR.');
        return;
    }
    if (!port || port < 1 || port > 65535) {
        alert('Enter a valid port number (1–65535).');
        return;
    }
    if (!table || !chain) {
        alert('Table and chain are required.');
        return;
    }

    var isV6 = ipRaw.indexOf(':') !== -1;
    var addrPrefix = isV6 ? 'ip6 saddr ' : 'ip saddr ';
    var protos = (proto === 'both') ? ['tcp', 'udp'] : [proto];
    var tag = 'wings-fw-port-' + port;
    var target = resolveTargetForRequest(family, table, chain);

    setStatus('info', '<i class="fa fa-spinner fa-spin"></i> Checking existing rules for port ' + port + '…');

    // Check existing rules first to avoid duplicate block-all and maintain correct order
    agentGet('/firewall/port/' + port)
        .then(function(data) {
            var existingRules = data.rules || [];
            var existingBlockalls = existingRules.filter(function(r) {
                return String(r.family) === target.family &&
                       String(r.table)  === target.table  &&
                       String(r.chain)  === target.chain  &&
                       String(r.expr || '').toLowerCase().indexOf(tag.toLowerCase() + '-blockall') !== -1;
            });

            setStatus('info', '<i class="fa fa-spinner fa-spin"></i> Applying block-all + whitelist for port ' + port + '…');

            // Add allow rules — insert BEFORE existing blockall if one exists
            var allowPromises = protos.map(function(p) {
                var allowExpr = addrPrefix + ipRaw + ' ' + p + ' dport ' + port + ' accept comment "' + tag + '-allow"';
                var payload = { family: target.family, table: target.table, chain: target.chain, rule: allowExpr };
                if (existingBlockalls.length > 0) {
                    payload.position = String(existingBlockalls[0].handle);
                }
                return postJSON('/firewall/rule/add', payload);
            });

            Promise.all(allowPromises)
                .then(function(allowResults) {
                    var allowErr = allowResults.find(function(r) { return r && r.error; });
                    if (allowErr) { setStatus('danger', '<i class="fa fa-times"></i> Error (allow phase): ' + allowErr.error); return; }

                    // Skip adding a new blockall if one already exists
                    if (existingBlockalls.length > 0) {
                        setStatus('success', '<i class="fa fa-check"></i> Allow rule for ' + ipRaw + ' added (block-all already exists for port ' + port + ').');
                        loadRules();
                        return;
                    }

                    var blockPromises = protos.map(function(p) {
                        var blockExpr = p + ' dport ' + port + ' drop comment "' + tag + '-blockall"';
                        return postJSON('/firewall/rule/add', { family: target.family, table: target.table, chain: target.chain, rule: blockExpr });
                    });

                    Promise.all(blockPromises).then(function(blockResults) {
                        var blockErr = blockResults.find(function(r) { return r && r.error; });
                        if (blockErr) { setStatus('danger', '<i class="fa fa-times"></i> Error (block phase): ' + blockErr.error); return; }
                        var note = target.resolved ? (' (resolved family to ' + target.family + ')') : '';
                        setStatus('success', '<i class="fa fa-check"></i> Port ' + port + ' is now blocked for all except ' + ipRaw + note + '.');
                        loadRules();
                    }).catch(function(e) { setStatus('danger', 'Request failed: ' + e.message); });
                })
                .catch(function(e) { setStatus('danger', 'Request failed: ' + e.message); });
        })
        .catch(function(e) { setStatus('danger', 'Lookup failed: ' + e.message); });
}

// ── Reset Rules for Specific Port ────────────────────────────────────────

function resetPortRules() {
    var port = parseInt(document.getElementById('reset-port').value, 10);
    var proto = document.getElementById('reset-proto').value;
    var family = document.getElementById('reset-family').value.trim();
    var table = document.getElementById('reset-table').value.trim();
    var chain = document.getElementById('reset-chain').value.trim();
    var managedOnly = document.getElementById('reset-managed-only').checked;

    if (!port || port < 1 || port > 65535) {
        alert('Enter a valid port number (1–65535).');
        return;
    }
    if (!table || !chain) {
        alert('Table and chain are required.');
        return;
    }

    var tag = 'wings-fw-port-' + port;
    var target = resolveTargetForRequest(family, table, chain);

    setStatus('info', '<i class="fa fa-spinner fa-spin"></i> Finding rules for port ' + port + '…');

    agentGet('/firewall/port/' + port)
        .then(function(data) {
            var rules = (data.rules || []).filter(function(rule) {
                if (String(rule.family) !== target.family || String(rule.table) !== target.table || String(rule.chain) !== target.chain) {
                    return false;
                }

                var expr = String(rule.expr || '').toLowerCase();
                if (proto !== 'both' && !expr.includes(proto + ' dport ' + port)) {
                    return false;
                }
                if (managedOnly && !expr.includes(tag.toLowerCase())) {
                    return false;
                }
                return true;
            });

            if (rules.length === 0) {
                setStatus('warning', '<i class="fa fa-info-circle"></i> No matching rules found to reset for port ' + port + '.');
                return;
            }

            var deletions = rules.map(function(rule) {
                return postJSON('/firewall/rule/delete', {
                    family: rule.family,
                    table: rule.table,
                    chain: rule.chain,
                    handle: rule.handle,
                });
            });

            Promise.all(deletions)
                .then(function(results) {
                    var err = results.find(function(r) { return r && r.error; });
                    if (err) {
                        setStatus('danger', '<i class="fa fa-times"></i> Reset failed: ' + err.error);
                        return;
                    }

                    setStatus('success', '<i class="fa fa-check"></i> Reset complete: removed ' + rules.length + ' rule(s) for port ' + port + '.');
                    loadRules();
                })
                .catch(function(e) {
                    setStatus('danger', 'Reset request failed: ' + e.message);
                });
        })
        .catch(function(e) {
            setStatus('danger', 'Lookup failed: ' + e.message);
        });
}

// ── Port Lookup ──────────────────────────────────────────────────────────────

var portLookupRules   = [];  // cached ordered rules for the current lookup
var portLookupPortNum = 0;

function lookupPort() {
    var port = parseInt(document.getElementById('lookup-port').value, 10);
    if (!port || port < 1 || port > 65535) {
        alert('Enter a valid port number.');
        return;
    }
    portLookupPortNum = port;

    agentGet('/firewall/port/' + port)
        .then(function(data) {
            var result = document.getElementById('port-lookup-result');
            var tbody  = document.getElementById('port-lookup-tbody');
            var empty  = document.getElementById('port-lookup-empty');
            result.style.display = '';
            portLookupRules = data.rules || [];

            if (portLookupRules.length === 0) {
                tbody.innerHTML = '';
                empty.style.display = '';
            } else {
                empty.style.display = 'none';
                renderPortLookupTable(portLookupRules);
            }
        })
        .catch(function(e) { alert('Lookup failed: ' + e.message); });
}

function renderPortLookupTable(rules) {
    var tbody = document.getElementById('port-lookup-tbody');
    var html = '';
    rules.forEach(function(rule, idx) {
        html += '<tr>';
        html += '<td><code>#' + rule.handle + '</code></td>';
        html += '<td>' + escHtml(rule.family) + '</td>';
        html += '<td>' + escHtml(rule.table) + '</td>';
        html += '<td>' + escHtml(rule.chain) + '</td>';
        html += '<td class="fw-rule-expr">' + colorizeExpr(escHtml(rule.expr)) + '</td>';
        html += '<td style="white-space:nowrap;">';
        if (idx > 0) {
            html += '<button class="btn btn-xs btn-default" title="Move Up (higher priority)" '
                + 'onclick="movePortLookupRule(' + idx + ', -1)">&uarr;</button> ';
        }
        if (idx < rules.length - 1) {
            html += '<button class="btn btn-xs btn-default" title="Move Down (lower priority)" '
                + 'onclick="movePortLookupRule(' + idx + ', 1)">&darr;</button>';
        }
        html += '</td>';
        html += '<td><button class="btn btn-xs btn-danger" '
              + 'onclick="confirmDelete('
              + rule.handle + ','
              + JSON.stringify(rule.family).replace(/"/g, '&quot;') + ','
              + JSON.stringify(rule.table).replace(/"/g, '&quot;') + ','
              + JSON.stringify(rule.chain).replace(/"/g, '&quot;') + ','
              + JSON.stringify(rule.expr).replace(/"/g, '&quot;') + ')">'
              + '<i class="fa fa-trash"></i></button></td>';
        html += '</tr>';
    });
    tbody.innerHTML = html;
}

// Move a rule up (-1) or down (+1) within the port lookup results.
// Implemented as delete + re-insert before the appropriate sibling handle.
function movePortLookupRule(idx, direction) {
    var rules = portLookupRules;
    var rule = rules[idx];
    if (!rule) return;
    var targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= rules.length) return;

    setStatus('info', '<i class="fa fa-spinner fa-spin"></i> Moving rule #' + rule.handle + '…');

    postJSON('/firewall/rule/delete', { family: rule.family, table: rule.table, chain: rule.chain, handle: rule.handle })
        .then(function(delResult) {
            if (delResult && delResult.error) {
                setStatus('danger', '<i class="fa fa-times"></i> Move failed (delete): ' + delResult.error);
                return;
            }
            var payload = { family: rule.family, table: rule.table, chain: rule.chain, rule: rule.expr };
            if (direction === -1) {
                // Moving up: insert BEFORE the rule that was above (now takes its slot)
                payload.position = String(rules[targetIdx].handle);
            } else {
                // Moving down: insert before the rule two steps ahead (skip over the swapped one)
                var afterNext = rules[targetIdx + 1];
                if (afterNext) { payload.position = String(afterNext.handle); }
                // no position = append at end
            }
            return postJSON('/firewall/rule/add', payload);
        })
        .then(function(addResult) {
            if (!addResult) return;
            if (addResult && addResult.error) {
                setStatus('danger', '<i class="fa fa-times"></i> Move failed (re-insert): ' + addResult.error);
                return;
            }
            setStatus('success', '<i class="fa fa-check"></i> Rule moved successfully.');
            document.getElementById('lookup-port').value = portLookupPortNum;
            lookupPort();
            loadRules();
        })
        .catch(function(e) { setStatus('danger', 'Move request failed: ' + e.message); });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function setStatus(type, html) {
    var el = document.getElementById('fw-status-msg');
    if (!el) return;
    var row = document.getElementById('fw-status-row');
    el.className = 'alert alert-' + type;
    el.innerHTML = html;
    row.style.display = '';
    if (type === 'success') {
        setTimeout(function() { row.style.display = 'none'; }, 4000);
    }
}

function postJSON(path, body) {
    return agentPost(path, body);
}

function escHtml(str) {
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#39;');
}

function detectVerdict(expr) {
    var e = (expr || '').toLowerCase();
    if (e.includes(' drop'))   return 'drop';
    if (e.includes(' accept')) return 'accept';
    if (e.includes(' reject')) return 'reject';
    return '';
}

function colorizeExpr(escaped) {
    // Highlight drop/accept/reject verdict words (already HTML-escaped)
    escaped = escaped.replace(/\bdrop\b/g,   '<span class="rule-verdict-drop">drop</span>');
    escaped = escaped.replace(/\baccept\b/g, '<span class="rule-verdict-accept">accept</span>');
    escaped = escaped.replace(/\breject\b/g, '<span class="rule-verdict-reject">reject</span>');
    return escaped;
}

// ── Boot ────────────────────────────────────────────────────────────────────
fetchTicket().then(function() { loadRules(); }).catch(function() {
    setStatus('danger', '<i class="fa fa-times"></i> Failed to obtain agent ticket.');
});
</script>
@endsection
