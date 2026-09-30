@extends('layouts.admin')

@section('title')
    {{ $node->name }}: Backups
@endsection

@section('content-header')
    <h1>{{ $node->name }}<small>Node Backup Management</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.nodes') }}">Nodes</a></li>
        <li><a href="{{ route('admin.nodes.view', $node->id) }}">{{ $node->name }}</a></li>
        <li class="active">Backups</li>
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
                    <li><a href="{{ route('admin.nodes.view.firewall', $node->id) }}">Firewall</a></li>
                @endif
                @endif
                <li><a href="{{ route('admin.nodes.view.logs', $node->id) }}">Logs</a></li>
                <li class="active"><a href="{{ route('admin.nodes.view.backups', $node->id) }}">Backups</a></li>
            </ul>
        </div>
    </div>
</div>

@if(!($isNodeBackupEnabled ?? true))
    <div class="row">
        <div class="col-xs-12">
            <div class="alert alert-warning alert-dismissible">
                <button type="button" class="close" data-dismiss="alert" aria-hidden="true">×</button>
                <h4><i class="icon fa fa-warning"></i> Backup Access Restricted</h4>
                <p style="margin-top: 8px; margin-bottom: 0;">
                    <strong>Enable Node Backup System and whitelist this node from wings agent addon setting to access backup page of node.</strong>
                </p>
                <p style="margin-top: 8px; margin-bottom: 0; font-size: 12px; color: #555;">
                    To enable backups for this node, go to <strong>Admin Dashboard → Addons → Wings Addon Configuration → Backup-Enabled Nodes</strong> and add this node to the list.
                </p>
            </div>
        </div>
    </div>
@else

{{-- Backup Configuration --}}
<form action="{{ route('admin.nodes.backups.config', $node->id) }}" method="POST" id="backupConfigForm">
    {!! csrf_field() !!}
    <div class="row">
        <div class="col-md-6">
            <div class="box box-primary">
                <div class="box-header with-border">
                    <h3 class="box-title">Backup Configuration</h3>
                </div>
                <div class="box-body">
                    <div class="form-group">
                        <label for="enabled">Enable Auto-Backup</label>
                        <select name="enabled" id="enabled" class="form-control">
                            <option value="0" @if(!$backupConfig || !$backupConfig->enabled) selected @endif>Disabled</option>
                            <option value="1" @if($backupConfig && $backupConfig->enabled) selected @endif>Enabled</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="schedule_type">Schedule Type</label>
                        <select name="schedule_type" id="schedule_type" class="form-control">
                            <option value="interval" @if($backupConfig && $backupConfig->schedule_type === 'interval') selected @endif>Interval Only</option>
                            <option value="fixed" @if($backupConfig && $backupConfig->schedule_type === 'fixed') selected @endif>Fixed Time Only</option>
                            <option value="both" @if($backupConfig && $backupConfig->schedule_type === 'both') selected @endif>Both (Interval + Fixed)</option>
                        </select>
                    </div>

                    <div class="row">
                        <div class="col-sm-6">
                            <div class="form-group">
                                <label for="interval_value">Interval Value</label>
                                <input type="number" name="interval_value" id="interval_value" class="form-control" min="1" max="255"
                                       value="{{ $backupConfig->interval_value ?? '' }}" placeholder="e.g. 24">
                            </div>
                        </div>
                        <div class="col-sm-6">
                            <div class="form-group">
                                <label for="interval_unit">Interval Unit</label>
                                <select name="interval_unit" id="interval_unit" class="form-control">
                                    <option value="hours" @if($backupConfig && $backupConfig->interval_unit === 'hours') selected @endif>Hours</option>
                                    <option value="days" @if($backupConfig && $backupConfig->interval_unit === 'days') selected @endif>Days</option>
                                    <option value="weeks" @if($backupConfig && $backupConfig->interval_unit === 'weeks') selected @endif>Weeks</option>
                                    <option value="months" @if($backupConfig && $backupConfig->interval_unit === 'months') selected @endif>Months</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="fixed_time">Fixed Time (24h)</label>
                        <input type="time" name="fixed_time" id="fixed_time" class="form-control"
                               value="{{ $backupConfig->fixed_time ?? '' }}">
                        <p class="small text-muted">Time in node's local timezone. Used for Fixed and Both schedule types.</p>
                    </div>

                    <div class="form-group">
                        <label for="max_file_size_mb">Max Server Size (MB, 0 = unlimited)</label>
                        <input type="number" name="max_file_size_mb" id="max_file_size_mb" class="form-control" min="0"
                               value="{{ $backupConfig->max_file_size_mb ?? 0 }}">
                        <p class="small text-muted">Servers exceeding this size will be skipped with a warning.</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-md-6">
            <div class="box box-primary">
                <div class="box-header with-border">
                    <h3 class="box-title">Retention & List Mode</h3>
                </div>
                <div class="box-body">
                    <div class="row">
                        <div class="col-sm-6">
                            <div class="form-group">
                                <label for="retention_max_count">Max Backup Count (0 = unlimited)</label>
                                <input type="number" name="retention_max_count" id="retention_max_count" class="form-control" min="0" max="65535"
                                       value="{{ $backupConfig->retention_max_count ?? 0 }}">
                            </div>
                        </div>
                        <div class="col-sm-6">
                            <div class="form-group">
                                <label for="retention_max_days">Max Backup Age (days, 0 = unlimited)</label>
                                <input type="number" name="retention_max_days" id="retention_max_days" class="form-control" min="0" max="65535"
                                       value="{{ $backupConfig->retention_max_days ?? 0 }}">
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="whitelist_mode">List Mode</label>
                        <select name="whitelist_mode" id="whitelist_mode" class="form-control">
                            <option value="0" @if(!$backupConfig || !$backupConfig->whitelist_mode) selected @endif>Blacklist (backup all except listed)</option>
                            <option value="1" @if($backupConfig && $backupConfig->whitelist_mode) selected @endif>Whitelist (only backup listed)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="discord_webhook_url">Discord Webhook URL (override)</label>
                        <input type="url" name="discord_webhook_url" id="discord_webhook_url" class="form-control"
                               value="{{ $backupConfig->discord_webhook_url ?? '' }}" placeholder="Leave empty to use global webhook">
                        <p class="small text-muted">Optional per-node override. Leave blank to use global wings-agent webhook.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    {{-- Storage Backends --}}
    <div class="row">
        <div class="col-xs-12">
            <div class="box box-info">
                <div class="box-header with-border">
                    <h3 class="box-title">Storage Backends</h3>
                    <div class="box-tools">
                        <button type="button" class="btn btn-sm btn-default" id="importBackendBtn" style="margin-right:6px;" title="Manage Global Storage Backends assigned to this node">
                            <i class="fa fa-globe"></i> Global Backends
                        </button>
                        <button type="button" class="btn btn-sm btn-success" id="addBackend"><i class="fa fa-plus"></i> Add Backend</button>
                    </div>
                </div>
                <div class="box-body" id="backendsContainer">
                    <p class="text-muted" id="noBackendsMsg">No storage backends configured. Add at least one to enable backups.</p>
                    <div id="backendsList"></div>
                </div>
            </div>
        </div>
    </div>

    <div class="row">
        <div class="col-xs-12">
            <button type="submit" class="btn btn-primary btn-lg">Save Configuration</button>
        </div>
    </div>
</form>

<hr>

{{-- Manual Trigger --}}
<div class="row" style="margin-top:20px;">
    <div class="col-md-4">
        <div class="box box-success">
            <div class="box-header with-border">
                <h3 class="box-title">Run Backup Now</h3>
            </div>
            <div class="box-body">
                <p>Trigger a manual backup run for this node. All eligible servers will be backed up.</p>
                <div style="margin-top:8px;">
                    <label style="font-weight:normal; cursor:pointer;">
                        <input type="checkbox" id="resetSchedule" style="opacity:1;position:static;margin-right:6px;vertical-align:middle;"> Reset auto-backup schedule timer
                    </label>
                </div>
                <div id="backendSelectGroup" style="display:none; margin-top:10px;">
                    <label style="font-weight:600; margin-bottom:4px; display:block; font-size:13px;">Backup destination:</label>
                    <select id="backendSelectDropdown" class="form-control input-sm"></select>
                </div>
            </div>
            <div class="box-footer">
                <button class="btn btn-success" id="triggerBackup">
                    <i class="fa fa-play"></i> Run Backup Now
                </button>
            </div>
        </div>
    </div>

    {{-- Progress --}}
    <div class="col-md-8">
        <div class="box box-default" id="progressBox" style="display:none;">
            <div class="box-header with-border">
                <h3 class="box-title">Backup Progress</h3>
            </div>
            <div class="box-body">
                <div class="progress progress-striped active">
                    <div class="progress-bar progress-bar-success" id="backupProgressBar" style="width:0%">
                        <span id="backupProgressText">0%</span>
                    </div>
                </div>
                <p id="backupStatusText" class="text-muted">Waiting...</p>
            </div>
        </div>
    </div>
</div>

<hr>

{{-- Backup Stats --}}
<div class="row" id="backupStatsRow">
    <div class="col-md-12">
        <div class="box box-info">
            <div class="box-header with-border">
                <h3 class="box-title"><i class="fa fa-bar-chart"></i> Backup Statistics</h3>
            </div>
            <div class="box-body">
                <div class="row text-center" id="statsContent">
                    <div class="col-sm-2">
                        <p class="text-muted" style="margin-bottom:4px;font-size:12px;">Last Auto Backup</p>
                        <strong id="statLastAuto">—</strong>
                    </div>
                    <div class="col-sm-2">
                        <p class="text-muted" style="margin-bottom:4px;font-size:12px;">Last Manual Backup</p>
                        <strong id="statLastManual">—</strong>
                    </div>
                    <div class="col-sm-3">
                        <p class="text-muted" style="margin-bottom:4px;font-size:12px;">Next Auto Backup</p>
                        <strong id="statNextAuto">—</strong>
                        <br><small class="text-muted" id="statCountdown"></small>
                    </div>
                    <div class="col-sm-2">
                        <p class="text-muted" style="margin-bottom:4px;font-size:12px;">Total Backups</p>
                        <strong id="statTotalCount">—</strong>
                    </div>
                    <div class="col-sm-3">
                        <p class="text-muted" style="margin-bottom:4px;font-size:12px;">Total Size</p>
                        <strong id="statTotalSize">—</strong>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<hr>

{{-- Whitelist / Blacklist --}}
<div class="row">
    <div class="col-md-6">
        <div class="box box-warning">
            <div class="box-header with-border">
                <h3 class="box-title" id="listTitle">{{ ($backupConfig && $backupConfig->whitelist_mode) ? 'Whitelist' : 'Blacklist' }}</h3>
                <div class="box-tools">
                    <button type="button" class="btn btn-sm btn-warning" id="addToListBtn"><i class="fa fa-plus"></i> Add Server</button>
                </div>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover" id="listTable">
                    <thead>
                        <tr>
                            <th>Server</th>
                            <th>Type</th>
                            <th>Added</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="listBody">
                        <tr><td colspan="4" class="text-muted text-center">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

{{-- Backup Runs (full-width) --}}
<div class="row">
    <div class="col-md-12">
        <div class="box box-default">
            <div class="box-header with-border">
                <h3 class="box-title">Backup Runs</h3>
                <div class="box-tools">
                    <button type="button" id="bulkDeleteBtn" class="btn btn-xs btn-danger" disabled style="margin-right:5px;"><i class="fa fa-trash"></i> Delete Selected</button>
                    <button type="button" class="btn btn-xs btn-default" onclick="loadHistory()"><i class="fa fa-refresh"></i></button>
                </div>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover" id="historyTable">
                    <thead>
                        <tr>
                            <th style="width:30px;"><input type="checkbox" id="selectAllRuns"></th>
                            <th>Run ID</th>
                            <th>Type</th>
                            <th>Backend</th>
                            <th>Servers</th>
                            <th>Size</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="historyBody">
                        <tr><td colspan="8" class="text-muted text-center">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

{{-- Run Detail Modal --}}
<div class="modal fade" id="runDetailModal" tabindex="-1" role="dialog" aria-labelledby="runDetailTitle">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="runDetailTitle">Run Detail</h4>
            </div>
            <div class="modal-body">
                <div class="input-group" style="margin-bottom:12px;">
                    <span class="input-group-addon"><i class="fa fa-search"></i></span>
                    <input type="text" class="form-control" id="runDetailSearch" placeholder="Search server name or UUID…">
                </div>
                <div class="table-responsive">
                    <table class="table table-hover" id="runDetailTable">
                        <thead>
                            <tr>
                                <th>Server</th>
                                <th>Status</th>
                                <th>Size</th>
                                <th>Started</th>
                                <th>Completed</th>
                                <th>Error</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="runDetailBody">
                            <tr><td colspan="7" class="text-center text-muted">Loading…</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>

{{-- Add Server to List Modal --}}
<div class="modal fade" id="addServerModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title">Add Server to List</h4>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="addServerSelect">Server</label>
                    <select id="addServerSelect" class="form-control"></select>
                </div>
                <div class="form-group">
                    <label for="addListType">List Type</label>
                    <select id="addListType" class="form-control">
                        <option value="blacklist">Blacklist</option>
                        <option value="whitelist">Whitelist</option>
                    </select>
                    <p class="small text-muted" style="margin-top:4px;">Automatically set based on your List Mode setting above.</p>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default btn-sm pull-left" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-warning btn-sm" id="confirmAddServer">Add</button>
            </div>
        </div>
    </div>
</div>

{{-- Assign Global Storage Backend Modal --}}
<div class="modal fade" id="importBackendModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title">Global Storage Backends</h4>
            </div>
            <div class="modal-body">
                <p class="text-muted" style="margin-bottom:12px;">Assign a global storage backend to this node. Test the connection first, then click <strong>Add to Node</strong>. Assigned backends are sent to the agent automatically — no local copy is created.</p>
                <div id="importBackendList">
                    <p class="text-muted text-center"><i class="fa fa-spinner fa-spin"></i> Loading global backends…</p>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default btn-sm pull-left" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>

{{-- Add / Edit Storage Backend Modal --}}
<div class="modal fade" id="addBackendModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="addBackendModalTitle">Add Storage Backend</h4>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="backendType">Backend Type</label>
                    <select id="backendType" class="form-control">
                        <option value="s3">Amazon S3 / S3-Compatible</option>
                        <option value="sftp">SFTP</option>
                        <option value="ftp">FTP / FTPS</option>
                        <option value="rsync">Rsync (over SSH)</option>
                        <option value="local">Local / Mounted (SMB/NFS)</option>
                    </select>
                </div>

                {{-- S3 fields --}}
                <div id="s3Fields" class="backend-fields">
                    <div class="row">
                        <div class="col-sm-6">
                            <div class="form-group"><label>Endpoint URL</label><input type="text" class="form-control" data-field="endpoint" placeholder="https://s3.amazonaws.com"></div>
                        </div>
                        <div class="col-sm-6">
                            <div class="form-group"><label>Region</label><input type="text" class="form-control" data-field="region" placeholder="us-east-1"></div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-sm-6">
                            <div class="form-group"><label>Bucket</label><input type="text" class="form-control" data-field="bucket"></div>
                        </div>
                        <div class="col-sm-6">
                            <div class="form-group"><label>Path Prefix</label><input type="text" class="form-control" data-field="path_prefix" placeholder="backups/"></div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-sm-6">
                            <div class="form-group"><label>Access Key</label><input type="text" class="form-control" data-field="access_key"></div>
                        </div>
                        <div class="col-sm-6">
                            <div class="form-group"><label>Secret Key</label><input type="password" class="form-control" data-field="secret_key"></div>
                        </div>
                    </div>
                </div>

                {{-- SFTP fields --}}
                <div id="sftpFields" class="backend-fields" style="display:none;">
                    <div class="row">
                        <div class="col-sm-8">
                            <div class="form-group"><label>Host</label><input type="text" class="form-control" data-field="host"></div>
                        </div>
                        <div class="col-sm-4">
                            <div class="form-group"><label>Port</label><input type="number" class="form-control" data-field="port" value="22"></div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-sm-6">
                            <div class="form-group"><label>Username</label><input type="text" class="form-control" data-field="username"></div>
                        </div>
                        <div class="col-sm-6">
                            <div class="form-group"><label>Password</label><input type="password" class="form-control" data-field="password"></div>
                        </div>
                    </div>
                    <div class="form-group"><label>Remote Path</label><input type="text" class="form-control" data-field="remote_path" placeholder="/backups"></div>
                    <div class="form-group"><label>SSH Key (optional, paste private key)</label><textarea class="form-control" data-field="ssh_key" rows="3"></textarea></div>
                </div>

                {{-- FTP fields --}}
                <div id="ftpFields" class="backend-fields" style="display:none;">
                    <div class="row">
                        <div class="col-sm-8">
                            <div class="form-group"><label>Host</label><input type="text" class="form-control" data-field="host"></div>
                        </div>
                        <div class="col-sm-4">
                            <div class="form-group"><label>Port</label><input type="number" class="form-control" data-field="port" value="21"></div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-sm-6">
                            <div class="form-group"><label>Username</label><input type="text" class="form-control" data-field="username"></div>
                        </div>
                        <div class="col-sm-6">
                            <div class="form-group"><label>Password</label><input type="password" class="form-control" data-field="password"></div>
                        </div>
                    </div>
                    <div class="form-group"><label>Remote Path</label><input type="text" class="form-control" data-field="remote_path" placeholder="/backups"></div>
                    <div style="margin:8px 0;"><label style="font-weight:normal;cursor:pointer;"><input type="checkbox" data-field="use_tls" style="opacity:1;position:static;margin-right:6px;vertical-align:middle;"> Use TLS/FTPS</label></div>
                </div>

                {{-- Rsync fields --}}
                <div id="rsyncFields" class="backend-fields" style="display:none;">
                    <div class="row">
                        <div class="col-sm-8">
                            <div class="form-group"><label>Host</label><input type="text" class="form-control" data-field="host"></div>
                        </div>
                        <div class="col-sm-4">
                            <div class="form-group"><label>SSH Port</label><input type="number" class="form-control" data-field="port" value="22"></div>
                        </div>
                    </div>
                    <div class="form-group"><label>Username</label><input type="text" class="form-control" data-field="username"></div>
                    <div class="form-group"><label>Remote Path</label><input type="text" class="form-control" data-field="remote_path" placeholder="/backups"></div>
                    <div class="form-group"><label>SSH Key (paste private key)</label><textarea class="form-control" data-field="ssh_key" rows="3"></textarea></div>
                </div>

                {{-- Local fields --}}
                <div id="localFields" class="backend-fields" style="display:none;">
                    <div class="form-group"><label>Local Path (pre-mounted SMB/NFS share)</label><input type="text" class="form-control" data-field="local_path" placeholder="/mnt/backups"></div>
                </div>

                {{-- Common fields --}}
                <hr>
                <div style="margin:8px 0;"><label style="font-weight:normal;cursor:pointer;"><input type="checkbox" id="backendEncrypt" style="opacity:1;position:static;margin-right:6px;vertical-align:middle;"> Encrypt archives (AES-256-GCM)</label></div>
                <div class="form-group" id="encryptionKeyGroup" style="display:none;">
                    <label>Encryption Key</label>
                    <input type="password" class="form-control" id="backendEncryptionKey">
                </div>

                {{-- Test result box --}}
                <div id="backendTestResult" style="display:none; margin-top:10px;"></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default btn-sm pull-left" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-info btn-sm" id="testBackendBtn" style="margin-right:6px;">
                    <i class="fa fa-plug"></i> Test Connection
                </button>
                <button type="button" class="btn btn-success btn-sm" id="confirmAddBackend" disabled title="Run Test Connection first">Add Backend</button>
            </div>
        </div>
    </div>
</div>

{{-- Restore Modal --}}
<div class="modal fade" id="restoreModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title">Restore Backup</h4>
            </div>
            <div class="modal-body">
                <p style="margin-bottom:12px;">Choose where to restore this backup:</p>
                <input type="hidden" id="restoreBackupId">
                <input type="hidden" id="restoreOriginalServerId">
                <input type="hidden" id="restoreTargetChoice" value="original">
                <div style="display:flex; gap:10px; margin-bottom:14px;">
                    <div id="restoreOptOriginal" onclick="setRestoreChoice('original')"
                        style="flex:1; border:2px solid #3c8dbc; border-radius:6px; padding:12px 10px; cursor:pointer; background:#e8f4fc; text-align:center; transition:all .15s;">
                        <i class="fa fa-server" style="font-size:20px; color:#3c8dbc; display:block; margin-bottom:6px;"></i>
                        <strong style="color:#3c8dbc;">Original Server</strong><br>
                        <small id="restoreOriginalLabel" class="text-muted"></small>
                    </div>
                    <div id="restoreOptOther" onclick="setRestoreChoice('other')"
                        style="flex:1; border:2px solid #ddd; border-radius:6px; padding:12px 10px; cursor:pointer; background:#fff; text-align:center; transition:all .15s;">
                        <i class="fa fa-exchange" style="font-size:20px; color:#777; display:block; margin-bottom:6px;"></i>
                        <strong style="color:#555;">Different Server</strong><br>
                        <small class="text-muted">Choose a target</small>
                    </div>
                </div>
                <div class="form-group" id="restoreTargetGroup" style="display:none;">
                    <label for="restoreTargetServer">Target Server</label>
                    <select id="restoreTargetServer" class="form-control"></select>
                </div>
                <div class="alert alert-warning" id="crossNodeWarn" style="display:none;">
                    <i class="fa fa-exclamation-triangle"></i> This is a cross-node restore. The backup will be transferred via the P2P engine.
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default btn-sm pull-left" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary btn-sm" id="confirmRestore"><i class="fa fa-undo"></i> Restore</button>
            </div>
            <div id="restoreStatusArea" style="display:none; padding:10px 15px 15px;"></div>
        </div>
    </div>
</div>

{{-- Delete Confirmation Modal --}}
<div class="modal fade" id="deleteConfirmModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-sm" role="document">
        <div class="modal-content">
            <div class="modal-header" style="background:#d9534f; color:#fff; border-radius:4px 4px 0 0;">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close" style="color:#fff; opacity:1;"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title"><i class="fa fa-trash"></i> <span id="deleteConfirmTitle">Confirm Delete</span></h4>
            </div>
            <div class="modal-body">
                <p id="deleteConfirmMsg">Are you sure you want to delete this?</p>
                <div class="well well-sm" style="margin-bottom:8px; background:#fff8f8; border-color:#d9534f;">
                    <label style="font-weight:normal; cursor:pointer; margin:0;">
                        <input type="checkbox" id="deleteForceCheck" style="opacity:1;position:static;margin-right:6px;vertical-align:middle;">
                        Force delete from panel if backend fails
                    </label>
                    <p class="small text-muted" style="margin:4px 0 0;">If checked, the database record will be removed even if the backend cannot delete the files.</p>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default btn-sm pull-left" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger btn-sm" id="deleteConfirmBtn"><i class="fa fa-trash"></i> Delete</button>
            </div>
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script>
    (function() {
        var nodeId = {{ $node->id }};
        var backupAgentTicketUrl = '{{ route('admin.nodes.wings-agent.ticket', $node->id) }}';
        var backupAgentBaseUrl = '';
        var backupAgentTicket = '';
        var backupAgentTicketExpiresAt = 0;
        var backends = [];
        var globalBackendsList = []; // list from /admin/api/global-storage-backends
        var editingIndex = null;  // null = adding new, integer = editing existing
        var testPassed   = false; // must pass Test Connection before saving
        // Track which global backend is the default for this node (from DB)
        var defaultGlobalBackendId = {{ $backupConfig?->default_global_backend_id ?? 'null' }};

        function fetchBackupAgentTicket(force) {
            if (!force && backupAgentTicket && backupAgentBaseUrl && Date.now() < backupAgentTicketExpiresAt) {
                return Promise.resolve({ base_url: backupAgentBaseUrl, ticket: backupAgentTicket });
            }

            return fetch(backupAgentTicketUrl, {
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
            })
                .then(function(r) {
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return r.json();
                })
                .then(function(d) {
                    if (!d.base_url || !d.ticket) throw new Error('Invalid agent ticket response');
                    backupAgentBaseUrl = d.base_url;
                    backupAgentTicket = d.ticket;
                    backupAgentTicketExpiresAt = Date.now() + Math.max(30, (d.ttl || 120) - 15) * 1000;
                    return d;
                });
        }

        function backupAgentUrl(path) {
            var separator = path.indexOf('?') >= 0 ? '&' : '?';
            return backupAgentBaseUrl + path + separator + 'ticket=' + encodeURIComponent(backupAgentTicket);
        }

        function fetchDirectBackupStatus() {
            return fetchBackupAgentTicket(false)
                .then(function() {
                    return fetch(backupAgentUrl('/node-backup/status'), {
                        headers: { 'Accept': 'application/json' }
                    });
                })
                .then(function(r) {
                    if (!r.ok) {
                        if (r.status === 401 || r.status === 403) {
                            backupAgentTicket = '';
                            backupAgentTicketExpiresAt = 0;
                        }
                        throw new Error('HTTP ' + r.status);
                    }
                    return r.json();
                });
        }

        function fetchPanelBackupStatus() {
            return fetch('/admin/nodes/view/' + nodeId + '/backups/status', { credentials: 'same-origin' })
                .then(function(r) { return r.json(); });
        }

        function fetchDirectKnownRunIds() {
            return fetchBackupAgentTicket(false)
                .then(function() {
                    return fetch(backupAgentUrl('/node-backup/list-runs?node_id=' + encodeURIComponent(nodeId)), {
                        headers: { 'Accept': 'application/json' }
                    });
                })
                .then(function(r) {
                    if (!r.ok) {
                        if (r.status === 401 || r.status === 403) {
                            backupAgentTicket = '';
                            backupAgentTicketExpiresAt = 0;
                        }
                        throw new Error('HTTP ' + r.status);
                    }
                    return r.json();
                });
        }

        function fetchPanelKnownRunIds() {
            return fetch('/admin/nodes/view/' + nodeId + '/backups/check-runs', { credentials: 'same-origin' })
                .then(function(r) { return r.json(); });
        }

        function fetchKnownRunIds() {
            return fetchDirectKnownRunIds().catch(function() { return fetchPanelKnownRunIds(); });
        }

        function fetchDirectRestoreStatus(backupId) {
            return fetchBackupAgentTicket(false)
                .then(function() {
                    return fetch(backupAgentUrl('/node-backup/restore-status?backup_id=' + encodeURIComponent(backupId)), {
                        headers: { 'Accept': 'application/json' }
                    });
                })
                .then(function(r) {
                    if (!r.ok) {
                        if (r.status === 401 || r.status === 403) {
                            backupAgentTicket = '';
                            backupAgentTicketExpiresAt = 0;
                        }
                        throw new Error('HTTP ' + r.status);
                    }
                    return r.json();
                });
        }

        function fetchPanelRestoreStatus(backupId) {
            return fetch('/admin/nodes/view/' + nodeId + '/backups/restore-status?backup_id=' + encodeURIComponent(backupId), { credentials: 'same-origin' })
                .then(function(r) { return r.json(); });
        }

        function fetchRestoreStatus(backupId) {
            return fetchDirectRestoreStatus(backupId).catch(function() { return fetchPanelRestoreStatus(backupId); });
        }

        function fetchBackupStatus() {
            return fetchDirectBackupStatus()
                .then(function(data) {
                    if (data && (data.running || data.last_error || data.latest_run)) {
                        return data;
                    }

                    return fetchPanelBackupStatus()
                        .then(function(panelData) {
                            if (panelData && (panelData.latest_run || panelData.last_error)) {
                                return panelData;
                            }
                            return data;
                        })
                        .catch(function() { return data; });
                })
                .catch(function() { return fetchPanelBackupStatus(); });
        }

        @if($backupConfig && $backupConfig->storage_backends)
            try { backends = JSON.parse({!! json_encode($backupConfig->storage_backends) !!}); } catch(e) {}
        @endif

        // ─── Load global backends list (for display + assign modal) ──────────
        function loadGlobalBackends(callback) {
            fetch('/admin/api/global-storage-backends', { credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    globalBackendsList = data.data || [];
                    if (callback) callback();
                })
                .catch(function() {
                    globalBackendsList = [];
                    if (callback) callback();
                });
        }
        loadGlobalBackends(function() {
            renderBackends();
        });

        // ─── Storage Backends UI ─────────────────────────────────────
        function backendLabel(b) {
            var label = b.name ? escHtml(b.name) + ' <span class="text-muted" style="font-size:11px;">(' + b.type.toUpperCase() + ')</span>' : b.type.toUpperCase();
            if (!b.name) {
                if (b.endpoint) label += ' — ' + b.endpoint;
                if (b.bucket)   label += ' / ' + b.bucket;
                if (b.host)     label += ' — ' + b.host;
                if (b.local_path) label += ' — ' + b.local_path;
            }
            return label;
        }

        function renderBackends() {
            var msg  = document.getElementById('noBackendsMsg');
            var list = document.getElementById('backendsList');

            // Globally assigned backends for this node
            var assignedGlobals = globalBackendsList.filter(isGlobalAssignedToNode);

            // Local backends that are NOT tied to a global (pure local)
            var localOnly = backends.filter(function(b) { return !b.global_backend_id; });

            var total = localOnly.length + assignedGlobals.length;
            if (total === 0) {
                msg.style.display  = '';
                list.innerHTML = '';
                renderBackendDropdown();
                return;
            }
            msg.style.display = 'none';
            var html = '';

            // ── Globally assigned backends (unified row — same whether assigned from
            //    WingsAddonConfig or the Add Backend modal on this page) ──────────
            assignedGlobals.forEach(function(g) {
                var isDefault = (defaultGlobalBackendId === g.id);
                html += '<div class="callout callout-' + (isDefault ? 'success' : 'info') + '" style="padding:10px 12px; margin-bottom:10px; display:flex; align-items:center; gap:8px;" id="global-row-' + g.id + '">';
                // Default radio
                html += '<label style="margin:0; cursor:pointer; display:flex; align-items:center; gap:5px; flex-shrink:0;" title="Set as default backend">';
                html += '<input type="radio" name="backendDefault" class="global-default-radio" data-global-id="' + g.id + '" ' + (isDefault ? 'checked' : '') + ' style="opacity:1;position:static;margin:0;"> ';
                html += '<span style="font-size:11px; color:' + (isDefault ? '#3c763d' : '#888') + ';">' + (isDefault ? '<i class="fa fa-star"></i> Default' : 'Default') + '</span>';
                html += '</label>';
                html += '<strong style="flex:1;">' + backendLabel(g) + '</strong>';
                html += ' <span class="label label-purple" style="background:#7c3aed; color:#fff;"><i class="fa fa-globe"></i> Global</span>';
                html += '<button type="button" class="btn btn-xs btn-danger remove-global-backend" data-global-id="' + g.id + '" style="flex-shrink:0;" title="Remove — unlinks this node from the global backend"><i class="fa fa-trash"></i></button>';
                html += '</div>';
            });

            // ── Local-only backends (not tied to global) ────────────────────
            localOnly.forEach(function(b, rawIdx) {
                // Find real index in backends array
                var i = backends.indexOf(b);
                var label = backendLabel(b);
                var isDefault = !!b.is_default && !defaultGlobalBackendId; // local default only matters if no global default is set
                html += '<div class="callout callout-' + (isDefault ? 'success' : 'info') + '" style="padding:10px 12px; margin-bottom:10px; display:flex; align-items:center; gap:8px;">';
                // Default radio
                html += '<label style="margin:0; cursor:pointer; display:flex; align-items:center; gap:5px; flex-shrink:0;" title="Set as default backend">';
                html += '<input type="radio" name="backendDefault" class="backend-default-radio" data-idx="' + i + '" ' + (isDefault ? 'checked' : '') + ' style="opacity:1;position:static;margin:0;"> ';
                html += '<span style="font-size:11px; color:' + (isDefault ? '#3c763d' : '#888') + ';">' + (isDefault ? '<i class="fa fa-star"></i> Default' : 'Default') + '</span>';
                html += '</label>';
                html += '<strong style="flex:1;">' + label + '</strong>';
                if (b.encrypt) html += ' <span class="label label-success" style="margin-left:4px;">Encrypted</span>';
                html += '<button type="button" class="btn btn-xs btn-info edit-backend" data-idx="' + i + '" style="flex-shrink:0;"><i class="fa fa-pencil"></i> Edit</button>';
                html += '<button type="button" class="btn btn-xs btn-danger remove-backend" data-idx="' + i + '" style="flex-shrink:0;" title="Delete"><i class="fa fa-trash"></i></button>';
                html += '</div>';
            });

            list.innerHTML = html + '<input type="hidden" name="storage_backends" value=\'' + JSON.stringify(backends).replace(/'/g, '&#39;') + '\'>'
                + '<input type="hidden" name="default_global_backend_id" id="defaultGlobalBackendIdInput" value="' + (defaultGlobalBackendId || '') + '">';
            renderBackendDropdown();
        }

        function escHtml(str) {
            return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }

        function isGlobalAssignedToNode(g) {
            return (g.assigned_node_ids || []).map(function(id) { return parseInt(id); }).indexOf(nodeId) !== -1;
        }

        function renderBackendDropdown() {
            var grp = document.getElementById('backendSelectGroup');
            var sel = document.getElementById('backendSelectDropdown');
            if (!grp || !sel) return;

            var localOnly = backends.filter(function(b) { return !b.global_backend_id; });
            var assignedGlobals = globalBackendsList.filter(isGlobalAssignedToNode);
            var total = localOnly.length + assignedGlobals.length;
            if (total <= 1) { grp.style.display = 'none'; return; }

            grp.style.display = '';
            sel.innerHTML = '';
            var allOpt = document.createElement('option');
            allOpt.value = '-1'; allOpt.text = 'All backends';
            sel.appendChild(allOpt);

            var defaultValue = '-1';

            // Local-only backends — agent index = j (0-based position among local-only)
            localOnly.forEach(function(b, j) {
                var opt = document.createElement('option');
                opt.value = 'local:' + j;
                opt.text = b.name
                    ? (escHtml(b.name) + ' (' + b.type.toUpperCase() + ')')
                    : b.type.toUpperCase() + (b.endpoint ? ' — ' + b.endpoint : '') + (b.bucket ? '/' + b.bucket : '') + (b.host ? ' — ' + b.host : '') + (b.local_path ? ' — ' + b.local_path : '');
                if (b.is_default && !defaultGlobalBackendId) defaultValue = opt.value;
                sel.appendChild(opt);
            });

            // Globally assigned backends
            assignedGlobals.forEach(function(g) {
                var opt = document.createElement('option');
                opt.value = 'global:' + g.id;
                opt.text = (g.name ? escHtml(g.name) : g.type.toUpperCase()) + ' (Global — ' + g.type.toUpperCase() + ')';
                if (defaultGlobalBackendId && g.id === defaultGlobalBackendId) defaultValue = opt.value;
                sel.appendChild(opt);
            });

            sel.value = defaultValue;
        }

        renderBackends();

        // Default radio change — local backend
        document.getElementById('backendsList').addEventListener('change', function(e) {
            var radio = e.target.closest('.backend-default-radio');
            if (radio) {
                var idx = parseInt(radio.dataset.idx);
                backends.forEach(function(b, i) { b.is_default = (i === idx); });
                // Clear any global default
                defaultGlobalBackendId = null;
                var hiddenInput = document.getElementById('defaultGlobalBackendIdInput');
                if (hiddenInput) hiddenInput.value = '';
                renderBackends();
            }
            // Global default radio
            var globalRadio = e.target.closest('.global-default-radio');
            if (globalRadio) {
                var gid = parseInt(globalRadio.dataset.globalId);
                var token = document.querySelector('meta[name="csrf-token"]')?.content || document.querySelector('input[name="_token"]')?.value;
                fetch('/admin/api/global-storage-backends/' + gid + '/set-default-for-node', {
                    method: 'POST', credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
                    body: JSON.stringify({ node_id: nodeId })
                })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.success) {
                        defaultGlobalBackendId = gid;
                        // Clear is_default from all local backends
                        backends.forEach(function(b) { b.is_default = false; });
                        renderBackends();
                    } else {
                        alert('Failed to set default: ' + (data.error || 'Unknown error'));
                        renderBackends(); // re-render to reset radio state
                    }
                })
                .catch(function() { renderBackends(); });
            }
        });

        document.getElementById('backendsContainer').addEventListener('click', function(e) {
            var token = document.querySelector('meta[name="csrf-token"]')?.content || document.querySelector('input[name="_token"]')?.value;
            // Remove local backend
            var removeBtn = e.target.closest('.remove-backend');
            if (removeBtn) { backends.splice(parseInt(removeBtn.dataset.idx), 1); renderBackends(); return; }
            // Edit local backend
            var editBtn = e.target.closest('.edit-backend');
            if (editBtn) { openBackendModal(parseInt(editBtn.dataset.idx)); return; }
            // Remove (unassign) global backend
            var removeGlobalBtn = e.target.closest('.remove-global-backend');
            if (removeGlobalBtn) {
                var gid = parseInt(removeGlobalBtn.dataset.globalId);
                if (!confirm('Remove this global backend from this node? It will be unlinked and will no longer be used for backups on this node.')) return;
                removeGlobalBtn.disabled = true;
                removeGlobalBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
                fetch('/admin/api/global-storage-backends/' + gid + '/unassign-node', {
                    method: 'POST', credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
                    body: JSON.stringify({ node_id: nodeId })
                })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.success) {
                        // Update globalBackendsList in place
                        var g = globalBackendsList.find(function(x) { return x.id === gid; });
                        if (g) g.assigned_node_ids = data.assigned_node_ids;
                        if (defaultGlobalBackendId === gid) defaultGlobalBackendId = null;
                        renderBackends();
                    } else {
                        removeGlobalBtn.disabled = false;
                        removeGlobalBtn.innerHTML = '<i class="fa fa-trash"></i>';
                        alert('Failed to remove: ' + (data.error || 'Unknown error'));
                    }
                })
                .catch(function(err) {
                    removeGlobalBtn.disabled = false;
                    removeGlobalBtn.innerHTML = '<i class="fa fa-trash"></i>';
                    alert('Request failed: ' + (err.message || String(err)));
                });
                return;
            }
        });

        document.getElementById('addBackend').addEventListener('click', function() {
            openBackendModal(null);
        });

        // ─── Open backend modal (add or edit) ────────────────────────
        function openBackendModal(idx) {
            editingIndex = idx;
            testPassed   = false;
            // Reset form
            document.querySelectorAll('.backend-fields').forEach(function(el) { el.style.display = 'none'; });
            document.getElementById('s3Fields').style.display = '';
            document.getElementById('backendType').value = 's3';
            document.getElementById('backendEncrypt').checked = false;
            document.getElementById('encryptionKeyGroup').style.display = 'none';
            document.getElementById('backendEncryptionKey').value = '';
            document.getElementById('backendTestResult').style.display = 'none';
            document.getElementById('backendTestResult').innerHTML = '';

            // Reset all inputs
            document.querySelectorAll('#addBackendModal [data-field]').forEach(function(el) {
                if (el.type === 'checkbox') el.checked = false;
                else if (el.tagName === 'TEXTAREA') el.value = '';
                else if (el.type === 'number') {}
                else el.value = '';
            });

            if (idx !== null && idx >= 0 && idx < backends.length) {
                // Edit mode: pre-fill
                var b = backends[idx];
                document.getElementById('addBackendModalTitle').textContent = 'Edit Storage Backend';
                document.getElementById('confirmAddBackend').textContent = 'Save Changes';
                document.getElementById('confirmAddBackend').classList.remove('btn-success');
                document.getElementById('confirmAddBackend').classList.add('btn-primary');
                var typeMap = {s3:'s3Fields', sftp:'sftpFields', ftp:'ftpFields', rsync:'rsyncFields', local:'localFields'};
                document.querySelectorAll('.backend-fields').forEach(function(el) { el.style.display = 'none'; });
                document.getElementById('backendType').value = b.type || 's3';
                var fieldsContainer = document.getElementById(typeMap[b.type] || 's3Fields');
                if (fieldsContainer) fieldsContainer.style.display = '';
                // Fill fields
                fieldsContainer && fieldsContainer.querySelectorAll('[data-field]').forEach(function(el) {
                    var field = el.dataset.field;
                    if (b[field] === undefined) return;
                    if (el.type === 'checkbox') el.checked = !!b[field];
                    else el.value = b[field];
                });
                if (b.encrypt) {
                    document.getElementById('backendEncrypt').checked = true;
                    document.getElementById('encryptionKeyGroup').style.display = '';
                    if (b.encryption_key) document.getElementById('backendEncryptionKey').value = b.encryption_key;
                }
            } else {
                // Add mode
                document.getElementById('addBackendModalTitle').textContent = 'Add Storage Backend';
                document.getElementById('confirmAddBackend').textContent = 'Add Backend';
                document.getElementById('confirmAddBackend').classList.remove('btn-primary');
                document.getElementById('confirmAddBackend').classList.add('btn-success');
                // Set default port values after resetting
                document.querySelector('#sftpFields [data-field="port"]').value = '22';
                document.querySelector('#ftpFields [data-field="port"]').value   = '21';
                document.querySelector('#rsyncFields [data-field="port"]').value = '22';
            }
            updateSaveButton();
            $('#addBackendModal').modal('show');
        }

        function updateSaveButton() {
            var btn = document.getElementById('confirmAddBackend');
            btn.disabled = !testPassed;
            btn.title = testPassed ? '' : 'Run Test Connection first to enable save';
        }

        // Reset testPassed when any field in the modal changes
        document.getElementById('addBackendModal').addEventListener('input', function() {
            testPassed = false; updateSaveButton();
        });
        document.getElementById('addBackendModal').addEventListener('change', function(e) {
            if (e.target.id !== 'backendType' && e.target.id !== 'backendEncrypt') {
                testPassed = false; updateSaveButton();
            }
        });

        document.getElementById('backendType').addEventListener('change', function() {
            document.querySelectorAll('.backend-fields').forEach(function(el) { el.style.display = 'none'; });
            var sel = this.value;
            var map = {s3:'s3Fields', sftp:'sftpFields', ftp:'ftpFields', rsync:'rsyncFields', local:'localFields'};
            if (map[sel]) document.getElementById(map[sel]).style.display = '';
            testPassed = false; updateSaveButton();
        });

        document.getElementById('backendEncrypt').addEventListener('change', function() {
            document.getElementById('encryptionKeyGroup').style.display = this.checked ? '' : 'none';
        });

        // ─── List Mode Sync ──────────────────────────────────────────
        // Sync the list title + modal default type with the whitelist_mode dropdown
        function syncListMode() {
            var isWhitelist = document.getElementById('whitelist_mode').value === '1';
            document.getElementById('listTitle').textContent = isWhitelist ? 'Whitelist' : 'Blacklist';
            document.getElementById('addListType').value = isWhitelist ? 'whitelist' : 'blacklist';
        }
        document.getElementById('whitelist_mode').addEventListener('change', syncListMode);
        // Run once on load to set initial state
        syncListMode();

        document.getElementById('confirmAddBackend').addEventListener('click', function() {
            var type = document.getElementById('backendType').value;
            var map = {s3:'s3Fields', sftp:'sftpFields', ftp:'ftpFields', rsync:'rsyncFields', local:'localFields'};
            var container = document.getElementById(map[type]);
            var backend = { type: type };
            container.querySelectorAll('[data-field]').forEach(function(el) {
                var field = el.dataset.field;
                if (el.type === 'checkbox') backend[field] = el.checked;
                else if (el.value.trim()) backend[field] = el.value.trim();
            });
            if (document.getElementById('backendEncrypt').checked) {
                backend.encrypt = true;
                var key = document.getElementById('backendEncryptionKey').value.trim();
                if (key) backend.encryption_key = key;
            }
            if (editingIndex !== null && editingIndex >= 0 && editingIndex < backends.length) {
                // Preserve is_default flag when editing
                backend.is_default = !!backends[editingIndex].is_default;
                backends[editingIndex] = backend;
            } else {
                // Ensure at least one default if none set
                if (backends.length === 0 || !backends.some(function(b) { return b.is_default; })) {
                    backend.is_default = (backends.length === 0);
                }
                backends.push(backend);
            }
            renderBackends();
            $('#addBackendModal').modal('hide');
        });

        // ─── Test Backend ─────────────────────────────────────────────
        function collectBackendData() {
            var type = document.getElementById('backendType').value;
            var map = {s3:'s3Fields', sftp:'sftpFields', ftp:'ftpFields', rsync:'rsyncFields', local:'localFields'};
            var container = document.getElementById(map[type]);
            var backend = { type: type };
            container.querySelectorAll('[data-field]').forEach(function(el) {
                var field = el.dataset.field;
                if (el.type === 'checkbox') backend[field] = el.checked;
                else if (el.value.trim()) backend[field] = el.value.trim();
            });
            return backend;
        }

        document.getElementById('testBackendBtn').addEventListener('click', function() {
            var btn = this;
            var resultBox = document.getElementById('backendTestResult');
            var token = document.querySelector('meta[name="csrf-token"]')?.content || document.querySelector('input[name="_token"]')?.value;
            var backend = collectBackendData();

            btn.disabled = true;
            btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Testing…';
            resultBox.style.display = 'none';
            resultBox.innerHTML = '';
            testPassed = false;
            updateSaveButton();

            fetch('/admin/nodes/view/' + nodeId + '/backups/test-backend', {
                method: 'POST', credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
                body: JSON.stringify({ backend: backend })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa fa-plug"></i> Test Connection';
                if (data.success) {
                    testPassed = true;
                    updateSaveButton();
                    resultBox.className = 'alert alert-success';
                    resultBox.innerHTML = '<i class="fa fa-check-circle"></i> <strong>Success:</strong> ' + escHtml(data.message || 'Backend is reachable and writable.');
                } else {
                    testPassed = false;
                    updateSaveButton();
                    resultBox.className = 'alert alert-danger';
                    resultBox.innerHTML = '<i class="fa fa-times-circle"></i> <strong>Failed:</strong><br><pre style="margin:6px 0 0;white-space:pre-wrap;font-size:12px;">' + escHtml(data.error || 'Unknown error') + '</pre>';
                }
                resultBox.style.display = '';
            })
            .catch(function(err) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa fa-plug"></i> Test Connection';
                testPassed = false;
                updateSaveButton();
                resultBox.className = 'alert alert-danger';
                resultBox.innerHTML = '<i class="fa fa-times-circle"></i> <strong>Request failed:</strong> ' + escHtml(err.message || String(err));
                resultBox.style.display = '';
            });
        });

        // Clear test result + state when modal is closed
        $('#addBackendModal').on('hidden.bs.modal', function() {
            document.getElementById('backendTestResult').style.display = 'none';
            document.getElementById('backendTestResult').innerHTML = '';
            testPassed   = false;
            editingIndex = null;
            updateSaveButton();
        });

        // ─── Assign Backend Modal ─────────────────────────────────────
        // (formerly "Import Backend" — now just assigns the node to the global backend)
        var importTestPassed = {}; // { globalId: bool }

        document.getElementById('importBackendBtn').addEventListener('click', function() {
            importTestPassed = {};
            renderImportBackendList();
            $('#importBackendModal').modal('show');
        });

        function renderImportBackendList() {
            var container = document.getElementById('importBackendList');
            if (globalBackendsList.length === 0) {
                container.innerHTML = '<p class="text-muted text-center">No global storage backends configured. Add them in WingsAddonConfig → Global Storage Backends.</p>';
                return;
            }
            var html = '<table class="table table-hover" style="margin-bottom:0;">';
            html += '<thead><tr><th>Name</th><th>Type</th><th style="width:260px;"></th></tr></thead><tbody>';
            globalBackendsList.forEach(function(g) {
                var alreadyAssigned = isGlobalAssignedToNode(g);
                html += '<tr id="import-row-' + g.id + '">';
                html += '<td><strong>' + escHtml(g.name) + '</strong></td>';
                html += '<td><span class="label label-info">' + g.type.toUpperCase() + '</span></td>';
                html += '<td style="white-space:nowrap;">';
                if (alreadyAssigned) {
                    html += '<span class="text-success" id="import-status-' + g.id + '"><i class="fa fa-check-circle"></i> Assigned to this node</span>';
                    // Allow re-testing and unassigning
                    html += ' <button type="button" class="btn btn-xs btn-danger unassign-btn" data-id="' + g.id + '" style="margin-left:4px;"><i class="fa fa-times"></i> Remove</button>';
                } else {
                    html += '<button type="button" class="btn btn-xs btn-info import-test-btn" data-id="' + g.id + '"><i class="fa fa-plug"></i> Test</button> ';
                    html += '<button type="button" class="btn btn-xs btn-success do-assign-btn" data-id="' + g.id + '" disabled><i class="fa fa-link"></i> Add to Node</button>';
                }
                html += '</td>';
                html += '</tr>';
                html += '<tr id="import-test-row-' + g.id + '" style="display:none;"><td colspan="3" style="padding:4px 10px;"><div id="import-test-result-' + g.id + '"></div></td></tr>';
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        }

        document.getElementById('importBackendList').addEventListener('click', function(e) {
            var token = document.querySelector('meta[name="csrf-token"]')?.content || document.querySelector('input[name="_token"]')?.value;

            // Test connection for a global backend — server-side secure call (no credentials in request)
            var testBtn = e.target.closest('.import-test-btn');
            if (testBtn) {
                var gid = parseInt(testBtn.dataset.id);
                testBtn.disabled = true;
                testBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
                var resultDiv = document.getElementById('import-test-result-' + gid);
                var testRow = document.getElementById('import-test-row-' + gid);
                testRow.style.display = '';
                resultDiv.innerHTML = '<span class="text-muted"><i class="fa fa-spinner fa-spin"></i> Testing connection…</span>';

                // Only send global_backend_id + node_id — credentials fetched from DB on server
                fetch('/admin/api/global-storage-backends/' + gid + '/test-secure', {
                    method: 'POST', credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
                    body: JSON.stringify({ node_id: nodeId })
                })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    testBtn.disabled = false;
                    testBtn.innerHTML = '<i class="fa fa-plug"></i> Re-test';
                    if (data.success) {
                        importTestPassed[gid] = true;
                        resultDiv.innerHTML = '<span class="text-success"><i class="fa fa-check-circle"></i> ' + escHtml(data.message || 'Connection successful') + '</span>';
                        var assignBtn = document.querySelector('.do-assign-btn[data-id="' + gid + '"]');
                        if (assignBtn) assignBtn.disabled = false;
                    } else {
                        importTestPassed[gid] = false;
                        resultDiv.innerHTML = '<span class="text-danger"><i class="fa fa-times-circle"></i> <strong>Failed:</strong> ' + escHtml(data.error || 'Unknown error') + '</span>';
                        var assignBtn = document.querySelector('.do-assign-btn[data-id="' + gid + '"]');
                        if (assignBtn) assignBtn.disabled = true;
                    }
                })
                .catch(function(err) {
                    testBtn.disabled = false;
                    testBtn.innerHTML = '<i class="fa fa-plug"></i> Re-test';
                    resultDiv.innerHTML = '<span class="text-danger"><i class="fa fa-times-circle"></i> Request failed: ' + escHtml(err.message || String(err)) + '</span>';
                });
                return;
            }

            // Assign (add node to global backend's assigned_node_ids)
            var assignBtn = e.target.closest('.do-assign-btn');
            if (assignBtn) {
                var gid = parseInt(assignBtn.dataset.id);
                assignBtn.disabled = true;
                assignBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Adding…';
                fetch('/admin/api/global-storage-backends/' + gid + '/assign-node', {
                    method: 'POST', credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
                    body: JSON.stringify({ node_id: nodeId })
                })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.success) {
                        // Update in-place in globalBackendsList
                        var g = globalBackendsList.find(function(x) { return x.id === gid; });
                        if (g) g.assigned_node_ids = data.assigned_node_ids;
                        // Update the row to show "Assigned"
                        var cell = document.querySelector('#import-row-' + gid + ' td:last-child');
                        if (cell) {
                            cell.innerHTML = '<span class="text-success" id="import-status-' + gid + '"><i class="fa fa-check-circle"></i> Assigned to this node</span>'
                                + ' <button type="button" class="btn btn-xs btn-danger unassign-btn" data-id="' + gid + '" style="margin-left:4px;"><i class="fa fa-times"></i> Remove</button>';
                        }
                        renderBackends(); // Update main list
                    } else {
                        assignBtn.disabled = false;
                        assignBtn.innerHTML = '<i class="fa fa-link"></i> Add to Node';
                        alert('Failed: ' + (data.error || 'Unknown error'));
                    }
                })
                .catch(function(err) {
                    assignBtn.disabled = false;
                    assignBtn.innerHTML = '<i class="fa fa-link"></i> Add to Node';
                    alert('Request failed: ' + (err.message || String(err)));
                });
                return;
            }

            // Unassign from within the modal
            var unassignBtn = e.target.closest('.unassign-btn');
            if (unassignBtn) {
                var gid = parseInt(unassignBtn.dataset.id);
                if (!confirm('Remove this node from the global backend?')) return;
                unassignBtn.disabled = true;
                unassignBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
                fetch('/admin/api/global-storage-backends/' + gid + '/unassign-node', {
                    method: 'POST', credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
                    body: JSON.stringify({ node_id: nodeId })
                })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.success) {
                        var g = globalBackendsList.find(function(x) { return x.id === gid; });
                        if (g) g.assigned_node_ids = data.assigned_node_ids;
                        if (defaultGlobalBackendId === gid) defaultGlobalBackendId = null;
                        renderImportBackendList(); // Refresh modal list
                        renderBackends();          // Update main list
                    } else {
                        unassignBtn.disabled = false;
                        unassignBtn.innerHTML = '<i class="fa fa-times"></i> Remove';
                        alert('Failed: ' + (data.error || 'Unknown error'));
                    }
                })
                .catch(function(err) {
                    unassignBtn.disabled = false;
                    unassignBtn.innerHTML = '<i class="fa fa-times"></i> Remove';
                    alert('Request failed: ' + (err.message || String(err)));
                });
                return;
            }
        });

        // ─── Whitelist/Blacklist ─────────────────────────────────────
        function loadList() {
            fetch('/admin/nodes/view/' + nodeId + '/backups/list', { credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    var body = document.getElementById('listBody');
                    if (!data.entries || data.entries.length === 0) {
                        body.innerHTML = '<tr><td colspan="4" class="text-muted text-center">No servers in list.</td></tr>';
                        return;
                    }
                    var html = '';
                    data.entries.forEach(function(e) {
                        var name = e.server ? e.server.name : 'Unknown';
                        html += '<tr>';
                        html += '<td>' + name + '</td>';
                        html += '<td><span class="label label-' + (e.list_type === 'whitelist' ? 'success' : 'danger') + '">' + e.list_type + '</span></td>';
                        html += '<td>' + (e.created_at || '') + '</td>';
                        html += '<td><button class="btn btn-xs btn-danger remove-from-list" data-server-id="' + e.server_id + '"><i class="fa fa-trash"></i></button></td>';
                        html += '</tr>';
                    });
                    body.innerHTML = html;
                });
        }
        loadList();

        document.getElementById('listBody').addEventListener('click', function(e) {
            var btn = e.target.closest('.remove-from-list');
            if (!btn) return;
            var token = document.querySelector('meta[name="csrf-token"]')?.content || document.querySelector('input[name="_token"]')?.value;
            fetch('/admin/nodes/view/' + nodeId + '/backups/list/remove', {
                method: 'POST', credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
                body: JSON.stringify({ server_id: parseInt(btn.dataset.serverId) })
            }).then(function() { loadList(); });
        });

        document.getElementById('addToListBtn').addEventListener('click', function() {
            // Pre-select list type based on current page mode before showing modal
            syncListMode();
            fetch('/admin/nodes/view/' + nodeId + '/backups/available-servers', { credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    var sel = document.getElementById('addServerSelect');
                    sel.innerHTML = '';
                    (data.servers || []).forEach(function(s) {
                        var opt = document.createElement('option');
                        opt.value = s.id; opt.text = s.name + ' (' + s.uuid.substr(0, 8) + ')';
                        sel.appendChild(opt);
                    });
                    $('#addServerModal').modal('show');
                });
        });

        document.getElementById('confirmAddServer').addEventListener('click', function() {
            var token = document.querySelector('meta[name="csrf-token"]')?.content || document.querySelector('input[name="_token"]')?.value;
            fetch('/admin/nodes/view/' + nodeId + '/backups/list/add', {
                method: 'POST', credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
                body: JSON.stringify({
                    server_id: parseInt(document.getElementById('addServerSelect').value),
                    list_type: document.getElementById('addListType').value
                })
            }).then(function() { $('#addServerModal').modal('hide'); loadList(); });
        });

        // ─── Backup History (grouped by run) ────────────────────────
        var allRunDetailRows = []; // cache for search filtering
        var currentRunDetailRunId = null;
        var currentRunIsOrphan = false;
        var knownRunIds = null; // null = agent not checked / unreachable

        function fmtDateTime(iso) {
            if (!iso) return '—';
            var d = new Date(iso.replace(' ', 'T'));
            if (isNaN(d)) return iso;
            return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
        }

        function loadHistory() {
            fetch('/admin/nodes/view/' + nodeId + '/backups/history-by-run', { credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    var items = data.data || [];
                    // After getting run list, check orphan status directly from the agent.
                    fetchKnownRunIds()
                        .then(function(checkData) {
                            knownRunIds = checkData.run_ids; // null = agent unreachable
                            renderHistory(items, knownRunIds);
                        })
                        .catch(function() {
                            knownRunIds = null;
                            renderHistory(items, null);
                        });
                });
        }
        // Expose to global scope so onclick="loadHistory()" works from HTML outside this IIFE
        window.loadHistory = loadHistory;

        function renderHistory(items, knownIds) {
            var body = document.getElementById('historyBody');
            if (items.length === 0) {
                body.innerHTML = '<tr><td colspan="9" class="text-muted text-center">No backup runs yet.</td></tr>';
                return;
            }
            var statusMap = {
                completed: 'success', failed: 'danger', partial: 'warning',
                running: 'info', pending: 'default'
            };
            var backendColorMap = { s3: 'warning', sftp: 'info', ftp: 'default', rsync: 'primary', local: 'success' };
            var html = '';
            items.forEach(function(r) {
                var isOrphan = knownIds !== null && r.status !== 'running' && knownIds.indexOf(r.run_id) === -1;
                var sizeStr = r.total_size ? fmtSize(r.total_size) : '—';
                var serversStr = r.server_count + (r.failed_count > 0 ? ' <span class="text-danger">(' + r.failed_count + ' failed)</span>' : '');
                var statusBadge = '<span class="label label-' + (statusMap[r.status] || 'default') + '">' + r.status + '</span>';
                if (isOrphan) statusBadge += ' <span class="label label-default"><i class="fa fa-ghost"></i> Orphan</span>';
                // Backend labels (from storage_paths keys)
                var backendTags = '';
                if (r.backend_labels && r.backend_labels.length > 0) {
                    r.backend_labels.forEach(function(b) {
                        backendTags += '<span class="label label-' + (backendColorMap[b] || 'default') + '" style="margin-right:2px;">' + b.toUpperCase() + '</span>';
                    });
                } else {
                    backendTags = '<span class="text-muted" style="font-size:11px;">—</span>';
                }
                html += '<tr' + (isOrphan ? ' class="warning"' : '') + '>';
                html += '<td><input type="checkbox" class="run-select" data-run-id="' + r.run_id + '" data-orphan="' + (isOrphan ? '1' : '0') + '"></td>';
                html += '<td><code style="font-size:11px;">' + r.run_id.substr(0,8) + '</code></td>';
                html += '<td><span class="label label-' + (r.type === 'auto' ? 'warning' : 'primary') + '">' + r.type + '</span></td>';
                html += '<td>' + backendTags + '</td>';
                html += '<td>' + serversStr + '</td>';
                html += '<td>' + sizeStr + '</td>';
                html += '<td>' + statusBadge + '</td>';
                html += '<td><small>' + fmtDateTime(r.started_at) + '</small></td>';
                html += '<td style="white-space:nowrap;">';
                html += '<button class="btn btn-xs btn-info view-run-btn" data-run-id="' + r.run_id + '" data-date="' + escHtml(r.started_at || '') + '" data-orphan="' + (isOrphan ? '1' : '0') + '" style="margin-right:4px;"><i class="fa fa-eye"></i> Detail</button>';
                html += '<button class="btn btn-xs btn-danger delete-run-btn" data-run-id="' + r.run_id + '" data-orphan="' + (isOrphan ? '1' : '0') + '"><i class="fa fa-trash"></i></button>';
                html += '</td>';
                html += '</tr>';
            });
            body.innerHTML = html;
            updateBulkActions();
        }

        function getSelectedRuns() {
            var out = [];
            document.querySelectorAll('#historyBody .run-select:checked').forEach(function(cb) {
                out.push({ runId: cb.dataset.runId, orphan: cb.dataset.orphan === '1' });
            });
            return out;
        }

        function updateBulkActions() {
            var selected = getSelectedRuns();
            var btn = document.getElementById('bulkDeleteBtn');
            if (!btn) return;
            btn.disabled = selected.length === 0;
            var selectAll = document.getElementById('selectAllRuns');
            if (selectAll) {
                var total = document.querySelectorAll('#historyBody .run-select').length;
                selectAll.checked = total > 0 && selected.length === total;
                selectAll.indeterminate = selected.length > 0 && selected.length < total;
            }
        }

        document.getElementById('selectAllRuns').addEventListener('change', function() {
            var checked = this.checked;
            document.querySelectorAll('#historyBody .run-select').forEach(function(cb) {
                cb.checked = checked;
            });
            updateBulkActions();
        });

        document.getElementById('historyBody').addEventListener('change', function(e) {
            if (!e.target || !e.target.classList.contains('run-select')) return;
            updateBulkActions();
        });

        document.getElementById('bulkDeleteBtn').addEventListener('click', function() {
            var selected = getSelectedRuns();
            if (!selected.length) return;
            var orphanOnly = selected.every(function(item) { return item.orphan; });
            var hasNonOrphan = selected.some(function(item) { return !item.orphan; });
            var msg = orphanOnly
                ? 'Delete ' + selected.length + ' orphaned backup run' + (selected.length > 1 ? 's' : '') + ' from the database?'
                : 'Delete ' + selected.length + ' backup run' + (selected.length > 1 ? 's' : '') + ' (including files for non-orphaned runs) from the backend?';

            showDeleteConfirm(
                'Delete Backup Runs',
                msg,
                function(force) { doDeleteSelectedRuns(selected, force); },
                orphanOnly
            );
        });

        function doDeleteSelectedRuns(items, force) {
            var token = document.querySelector('meta[name="csrf-token"]')?.content || document.querySelector('input[name="_token"]')?.value;
            var remaining = items.slice();
            var failed = [];

            function next() {
                if (remaining.length === 0) {
                    loadHistory();
                    loadStats();
                    updateBulkActions();
                    if (failed.length > 0) {
                        alert('Some runs could not be deleted: ' + failed.join(', '));
                    }
                    return;
                }
                var item = remaining.shift();
                var qs = '?force=' + (force ? '1' : '0') + '&orphan=' + (item.orphan ? '1' : '0');

                fetch('/admin/nodes/view/' + nodeId + '/backups/run/' + encodeURIComponent(item.runId) + qs, {
                    method: 'DELETE', credentials: 'same-origin',
                    headers: { 'X-CSRF-TOKEN': token }
                })
                .then(function(r) { return r.json(); })
                .then(function(d) {
                    if (!d.success) failed.push(item.runId.substr(0, 8));
                    next();
                })
                .catch(function() {
                    failed.push(item.runId.substr(0, 8));
                    next();
                });
            }
            next();
        }

        loadHistory();

        document.getElementById('historyBody').addEventListener('click', function(e) {
            // View detail
            var viewBtn = e.target.closest('.view-run-btn');
            if (viewBtn) {
                var runId = viewBtn.dataset.runId;
                var orphan = viewBtn.dataset.orphan === '1';
                currentRunDetailRunId = runId;
                currentRunIsOrphan = orphan;
                document.getElementById('runDetailTitle').textContent = 'Run Detail — ' + runId.substr(0,8) + ' — ' + fmtDateTime(viewBtn.dataset.date);
                document.getElementById('runDetailSearch').value = '';
                document.getElementById('runDetailBody').innerHTML = '<tr><td colspan="7" class="text-center text-muted">Loading...</td></tr>';
                $('#runDetailModal').modal('show');
                fetch('/admin/nodes/view/' + nodeId + '/backups/run/' + encodeURIComponent(runId), { credentials: 'same-origin' })
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        allRunDetailRows = data.data || [];
                        renderRunDetail(allRunDetailRows, orphan);
                    });
                return;
            }

            // Delete run
            var delBtn = e.target.closest('.delete-run-btn');
            if (delBtn) {
                var runId = delBtn.dataset.runId;
                var orphan = delBtn.dataset.orphan === '1';
                showDeleteConfirm(
                    'Delete Backup Run',
                    orphan
                        ? 'This run is <strong>orphaned</strong> (files not found on backend). Remove it from the database?'
                        : 'Delete backup run <code>' + runId.substr(0,8) + '</code>? This will permanently delete all files on the backend.',
                    function(force) {
                        doDeleteRun(runId, orphan, force);
                    },
                    orphan // hide force option if orphan
                );
                return;
            }
        });

        function renderRunDetail(rows, isOrphan) {
            var body = document.getElementById('runDetailBody');
            if (!rows || rows.length === 0) {
                body.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No entries found.</td></tr>';
                return;
            }
            var statusMap = { completed: 'success', failed: 'danger', running: 'info', pending: 'default' };
            var html = '';
            rows.forEach(function(b) {
                var name = b.is_node_archive ? '<em>Node Config Archive</em>' :
                           (b.server ? (escHtml(b.server.name) + ' <small class="text-muted">(' + b.server.uuid.substr(0,8) + ')</small>') : '—');
                var sizeStr = b.size_bytes ? fmtSize(b.size_bytes) : '—';
                var canRestore = !b.is_node_archive && b.status === 'completed';
                var errMsg = b.error_message || '';
                var errorCell = errMsg
                    ? '<span class="text-danger" title="' + escHtml(errMsg) + '" style="cursor:help;">' +
                      escHtml(errMsg.length > 70 ? errMsg.substr(0, 70) + '…' : errMsg) + '</span>'
                    : '<span class="text-muted">—</span>';
                html += '<tr' + (b.status === 'failed' ? ' class="danger"' : (b.status === 'running' ? ' class="info"' : '')) + '>';
                html += '<td>' + name + '</td>';
                var dedupBadge = b.is_deduplicated ? ' <span class="label label-info" title="Created with Restic deduplication" style="margin-left:3px;">Dedup</span>' : '';
                html += '<td><span class="label label-' + (statusMap[b.status] || 'default') + '">' + b.status + '</span>' + dedupBadge + '</td>';
                html += '<td>' + sizeStr + '</td>';
                html += '<td><small>' + fmtDateTime(b.started_at) + '</small></td>';
                html += '<td><small>' + fmtDateTime(b.completed_at) + '</small></td>';
                html += '<td style="max-width:240px;font-size:12px;">' + errorCell + '</td>';
                html += '<td style="white-space:nowrap;">';
                if (canRestore) {
                    html += '<button class="btn btn-xs btn-primary detail-restore-btn" data-backup-id="' + b.id + '" style="margin-right:3px;"><i class="fa fa-undo"></i> Restore</button>';
                }
                html += '<button class="btn btn-xs btn-danger detail-delete-btn" data-backup-id="' + b.id + '" data-orphan="' + (isOrphan ? '1' : '0') + '"><i class="fa fa-trash"></i></button>';
                html += '</td>';
                html += '</tr>';
            });
            body.innerHTML = html;
        }

        document.getElementById('runDetailBody').addEventListener('click', function(e) {
            // Per-entry restore
            var restoreBtn = e.target.closest('.detail-restore-btn');
            if (restoreBtn) {
                var backupId = restoreBtn.dataset.backupId;
                document.getElementById('restoreBackupId').value = backupId;
                document.getElementById('crossNodeWarn').style.display = 'none';
                // Find the backup's original server from the currently displayed run
                var originalServerId = '';
                var originalServerLabel = '';
                if (allRunDetailRows) {
                    var found = allRunDetailRows.find(function(b) { return b.id == backupId; });
                    if (found && found.server_id) {
                        originalServerId = found.server_id;
                        originalServerLabel = found.server ? found.server.name : '';
                    }
                }
                document.getElementById('restoreOriginalServerId').value = originalServerId;
                document.getElementById('restoreOriginalLabel').textContent = originalServerLabel ? '(' + originalServerLabel + ')' : '';
                // Disable original option if no server attached; lock to "other"
                var origCard = document.getElementById('restoreOptOriginal');
                if (!originalServerId) {
                    origCard.style.opacity = '0.4';
                    origCard.style.cursor = 'not-allowed';
                    origCard.onclick = null;
                    setRestoreChoice('other');
                } else {
                    origCard.style.opacity = '1';
                    origCard.style.cursor = 'pointer';
                    origCard.onclick = function() { setRestoreChoice('original'); };
                    setRestoreChoice('original');
                }
                // Populate server list
                fetch('/admin/nodes/view/' + nodeId + '/backups/available-servers', { credentials: 'same-origin' })
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        var sel = document.getElementById('restoreTargetServer');
                        sel.innerHTML = '';
                        (data.servers || []).forEach(function(s) {
                            var opt = document.createElement('option');
                            opt.value = s.id; opt.text = s.name + ' (' + s.uuid.substr(0,8) + ')';
                            sel.appendChild(opt);
                        });
                        $('#restoreModal').modal('show');
                    });
                return;
            }

            // Per-entry delete
            var delBtn = e.target.closest('.detail-delete-btn');
            if (delBtn) {
                var backupId = delBtn.dataset.backupId;
                var orphan = delBtn.dataset.orphan === '1';
                showDeleteConfirm(
                    'Delete Backup Entry',
                    orphan
                        ? 'Remove this <strong>orphaned</strong> backup entry from the database?'
                        : 'Permanently delete this backup and its files from the backend?',
                    function(force) { doDeleteEntry(backupId, orphan, force); },
                    orphan
                );
            }
        });

        document.getElementById('runDetailSearch').addEventListener('input', function() {
            var q = this.value.toLowerCase();
            if (!q) { renderRunDetail(allRunDetailRows, currentRunIsOrphan); return; }
            var filtered = allRunDetailRows.filter(function(b) {
                var name = b.is_node_archive ? 'node config' :
                    ((b.server ? b.server.name + ' ' + b.server.uuid : '') || '');
                return name.toLowerCase().indexOf(q) !== -1;
            });
            renderRunDetail(filtered, currentRunIsOrphan);
        });

        // ─── Delete Confirmation ──────────────────────────────────────
        var _deleteCallback = null;
        function showDeleteConfirm(title, msg, callback, hideForce) {
            document.getElementById('deleteConfirmTitle').textContent = title;
            document.getElementById('deleteConfirmMsg').innerHTML = msg;
            document.getElementById('deleteForceCheck').checked = false;
            document.querySelector('#deleteConfirmModal .well').style.display = hideForce ? 'none' : '';
            _deleteCallback = callback;
            $('#deleteConfirmModal').modal('show');
        }
        document.getElementById('deleteConfirmBtn').addEventListener('click', function() {
            var force = document.getElementById('deleteForceCheck').checked;
            $('#deleteConfirmModal').modal('hide');
            if (_deleteCallback) { _deleteCallback(force); _deleteCallback = null; }
        });

        function doDeleteRun(runId, isOrphan, force) {
            var token = document.querySelector('meta[name="csrf-token"]')?.content || document.querySelector('input[name="_token"]')?.value;
            var qs = '?force=' + (force ? '1' : '0') + '&orphan=' + (isOrphan ? '1' : '0');
            fetch('/admin/nodes/view/' + nodeId + '/backups/run/' + encodeURIComponent(runId) + qs, {
                method: 'DELETE', credentials: 'same-origin',
                headers: { 'X-CSRF-TOKEN': token }
            }).then(function(r) { return r.json(); })
              .then(function(d) {
                if (d.success) {
                    loadHistory(); loadStats();
                } else {
                    alert('Delete failed: ' + (d.error || 'Unknown error'));
                }
              }).catch(function() { alert('Request failed.'); });
        }

        function doDeleteEntry(backupId, isOrphan, force) {
            var token = document.querySelector('meta[name="csrf-token"]')?.content || document.querySelector('input[name="_token"]')?.value;
            var qs = '?force=' + (force ? '1' : '0') + '&orphan=' + (isOrphan ? '1' : '0');
            fetch('/admin/nodes/view/' + nodeId + '/backups/entry/' + backupId + qs, {
                method: 'DELETE', credentials: 'same-origin',
                headers: { 'X-CSRF-TOKEN': token }
            }).then(function(r) { return r.json(); })
              .then(function(d) {
                if (d.success) {
                    // Refresh detail modal
                    fetch('/admin/nodes/view/' + nodeId + '/backups/run/' + encodeURIComponent(currentRunDetailRunId), { credentials: 'same-origin' })
                        .then(function(r) { return r.json(); })
                        .then(function(data) {
                            allRunDetailRows = data.data || [];
                            renderRunDetail(allRunDetailRows, currentRunIsOrphan);
                        });
                    loadStats();
                } else {
                    alert('Delete failed: ' + (d.error || 'Unknown error'));
                }
              }).catch(function() { alert('Request failed.'); });
        }

        // ─── Manual Trigger ──────────────────────────────────────────
        // Clickable card toggle for restore target selection
        window.setRestoreChoice = function(choice) {
            document.getElementById('restoreTargetChoice').value = choice;
            var origCard  = document.getElementById('restoreOptOriginal');
            var otherCard = document.getElementById('restoreOptOther');
            var group     = document.getElementById('restoreTargetGroup');
            if (choice === 'original') {
                origCard.style.borderColor  = '#3c8dbc'; origCard.style.background  = '#e8f4fc';
                origCard.querySelector('strong').style.color = '#3c8dbc';
                origCard.querySelector('.fa').style.color    = '#3c8dbc';
                otherCard.style.borderColor = '#ddd';     otherCard.style.background = '#fff';
                otherCard.querySelector('strong').style.color = '#555';
                otherCard.querySelector('.fa').style.color    = '#777';
                group.style.display = 'none';
            } else {
                otherCard.style.borderColor = '#3c8dbc'; otherCard.style.background  = '#e8f4fc';
                otherCard.querySelector('strong').style.color = '#3c8dbc';
                otherCard.querySelector('.fa').style.color    = '#3c8dbc';
                origCard.style.borderColor  = '#ddd';    origCard.style.background   = '#fff';
                origCard.querySelector('strong').style.color = '#555';
                origCard.querySelector('.fa').style.color    = '#777';
                group.style.display = '';
            }
        };

        var _restorePollTimer = null;

        function stopRestorePoll() {
            if (_restorePollTimer) { clearInterval(_restorePollTimer); _restorePollTimer = null; }
        }

        function showRestoreStatus(statusObj) {
            var area = document.getElementById('restoreStatusArea');
            area.style.display = '';
            var statusStr = statusObj.status || 'unknown';
            var html = '';
            if (statusStr === 'running') {
                html = '<div class="alert alert-info" style="margin:0;"><i class="fa fa-spinner fa-spin"></i> <strong>Restoring…</strong> The server files are being extracted. This may take several minutes.</div>';
            } else if (statusStr === 'completed') {
                html = '<div class="alert alert-success" style="margin:0;"><i class="fa fa-check-circle"></i> <strong>Restore completed successfully!</strong></div>';
                stopRestorePoll();
                document.getElementById('confirmRestore').disabled = false;
                document.getElementById('confirmRestore').innerHTML = '<i class="fa fa-undo"></i> Restore Again';
            } else if (statusStr === 'failed') {
                var errMsg = statusObj.error || 'Unknown error';
                html = '<div class="alert alert-danger" style="margin:0;"><i class="fa fa-times-circle"></i> <strong>Restore failed:</strong><br><pre style="margin:6px 0 0;white-space:pre-wrap;font-size:12px;">' + escHtml(errMsg) + '</pre></div>';
                stopRestorePoll();
                document.getElementById('confirmRestore').disabled = false;
                document.getElementById('confirmRestore').innerHTML = '<i class="fa fa-undo"></i> Retry Restore';
            } else {
                html = '<div class="alert alert-warning" style="margin:0;"><i class="fa fa-clock-o"></i> Status: ' + escHtml(statusStr) + '</div>';
            }
            area.innerHTML = html;
        }

        // Reset restore status area when modal closes
        $('#restoreModal').on('hidden.bs.modal', function() {
            stopRestorePoll();
            var area = document.getElementById('restoreStatusArea');
            area.style.display = 'none';
            area.innerHTML = '';
            document.getElementById('confirmRestore').disabled = false;
            document.getElementById('confirmRestore').innerHTML = '<i class="fa fa-undo"></i> Restore';
        });

        document.getElementById('confirmRestore').addEventListener('click', function() {
            var token = document.querySelector('meta[name="csrf-token"]')?.content || document.querySelector('input[name="_token"]')?.value;
            var backupId = document.getElementById('restoreBackupId').value;
            var choice = document.getElementById('restoreTargetChoice').value;
            var targetServerId;
            if (choice === 'original') {
                targetServerId = parseInt(document.getElementById('restoreOriginalServerId').value);
            } else {
                targetServerId = parseInt(document.getElementById('restoreTargetServer').value);
            }
            if (!targetServerId) { alert('No target server selected.'); return; }
            var btn = this;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Starting…';
            // Reset status area
            var area = document.getElementById('restoreStatusArea');
            area.style.display = '';
            area.innerHTML = '<div class="alert alert-info" style="margin:0;"><i class="fa fa-spinner fa-spin"></i> Submitting restore request…</div>';
            stopRestorePoll();

            fetch('/admin/nodes/view/' + nodeId + '/backups/restore', {
                method: 'POST', credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
                body: JSON.stringify({ backup_id: parseInt(backupId), target_server_id: targetServerId })
            }).then(function(r) { return r.json(); }).then(function(data) {
                if (data.success) {
                    btn.innerHTML = '<i class="fa fa-undo"></i> Restore';
                    // Show running status and start polling
                    showRestoreStatus({ status: 'running' });
                    var pollCount = 0;
                    _restorePollTimer = setInterval(function() {
                        pollCount++;
                        fetchRestoreStatus(backupId)
                            .then(function(s) {
                                if (s.status === 'completed' || s.status === 'failed') {
                                    showRestoreStatus(s);
                                } else if (pollCount > 90) {
                                    // 3 minutes timeout
                                    stopRestorePoll();
                                    showRestoreStatus({ status: 'failed', error: 'Restore timed out — check server logs for details.' });
                                }
                            })
                            .catch(function() {
                                if (pollCount > 90) {
                                    stopRestorePoll();
                                    showRestoreStatus({ status: 'failed', error: 'Lost connection to agent while polling restore status.' });
                                }
                            });
                    }, 2000);
                } else {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa fa-undo"></i> Restore';
                    area.innerHTML = '<div class="alert alert-danger" style="margin:0;"><i class="fa fa-times-circle"></i> <strong>Restore failed to start:</strong> ' + escHtml(data.error || 'Unknown error') + '</div>';
                }
            }).catch(function(err) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa fa-undo"></i> Restore';
                area.innerHTML = '<div class="alert alert-danger" style="margin:0;"><i class="fa fa-times-circle"></i> Request failed: ' + escHtml(err.message || String(err)) + '</div>';
            });
        });

        document.getElementById('triggerBackup').addEventListener('click', function() {
            var btn = this;
            btn.disabled = true;
            var token = document.querySelector('meta[name="csrf-token"]')?.content || document.querySelector('input[name="_token"]')?.value;
            // Determine backend selection
            var backendIndex = null;
            var globalBackendId = null;
            var localOnly = backends.filter(function(b) { return !b.global_backend_id; });
            var assignedGlobals = globalBackendsList.filter(isGlobalAssignedToNode);
            var totalBackends = localOnly.length + assignedGlobals.length;
            if (totalBackends === 1) {
                if (localOnly.length === 1) {
                    backendIndex = 0;
                } else if (assignedGlobals.length === 1) {
                    globalBackendId = assignedGlobals[0].id;
                }
            } else if (totalBackends > 1) {
                var selVal = document.getElementById('backendSelectDropdown').value;
                if (selVal.startsWith('local:')) {
                    var j = parseInt(selVal.substring(6));
                    if (!isNaN(j) && j >= 0) backendIndex = j;
                } else if (selVal.startsWith('global:')) {
                    var gid = parseInt(selVal.substring(7));
                    if (!isNaN(gid) && gid > 0) globalBackendId = gid;
                }
                // selVal === '-1' → both null → all backends run
            }
            fetch('/admin/nodes/view/' + nodeId + '/backups/trigger', {
                method: 'POST', credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
                body: JSON.stringify({
                    reset_schedule: document.getElementById('resetSchedule').checked,
                    backend_index: backendIndex,
                    global_backend_id: globalBackendId,
                })
            }).then(function(r) { return r.json(); }).then(function(data) {
                btn.disabled = false;
                if (data.success) {
                    document.getElementById('progressBox').style.display = '';
                    startProgressSSE();
                } else {
                    alert('Failed: ' + (data.error || 'Unknown error'));
                }
            }).catch(function() { btn.disabled = false; });
        });

        // ─── SSE Progress ────────────────────────────────────────────
        var activeSSE = null;
        var progressRetryTimer = null;
        var progressStreamClosed = false;

        function clearProgressRetryTimer() {
            if (progressRetryTimer) {
                clearTimeout(progressRetryTimer);
                progressRetryTimer = null;
            }
        }

        function closeActiveProgressSSE() {
            if (activeSSE) {
                activeSSE.onmessage = null;
                activeSSE.onerror = null;
                activeSSE.close();
                activeSSE = null;
            }
        }

        function stopProgressSSE() {
            progressStreamClosed = true;
            clearProgressRetryTimer();
            closeActiveProgressSSE();
        }

        function scheduleProgressReconnect(delay) {
            if (progressStreamClosed) return;
            clearProgressRetryTimer();
            progressRetryTimer = setTimeout(function() {
                progressRetryTimer = null;
                if (!progressStreamClosed) startProgressSSE();
            }, delay);
        }

        function renderTerminalBackupState(run) {
            if (!run || !run.status) return false;
            var bar = document.getElementById('backupProgressBar');
            var text = document.getElementById('backupProgressText');
            var status = document.getElementById('backupStatusText');
            var total = run.total || 0;
            var completed = run.completed || 0;
            var pct = total > 0 ? Math.round((completed / total) * 100) : 100;
            var isDone = run.status === 'completed';
            var isPartial = run.status === 'partial';

            document.getElementById('progressBox').style.display = '';
            bar.style.width = pct + '%';
            text.textContent = pct + '% (' + completed + '/' + total + ')';
            bar.classList.remove('progress-bar-success', 'progress-bar-danger', 'progress-bar-warning');
            bar.classList.add(isDone ? 'progress-bar-success' : (isPartial ? 'progress-bar-warning' : 'progress-bar-danger'));

            var failInfo = isPartial && run.failed ? ' (' + run.failed + '/' + total + ' failed)' : '';
            status.textContent = 'Backup ' + run.status + failInfo;
            return true;
        }

        function startProgressSSE() {
            progressStreamClosed = false;
            clearProgressRetryTimer();
            closeActiveProgressSSE();
            var bar = document.getElementById('backupProgressBar');
            var text = document.getElementById('backupProgressText');
            var status = document.getElementById('backupStatusText');
            status.textContent = 'Starting backup...';
            fetchBackupAgentTicket(true)
                .then(function() {
                    if (progressStreamClosed) return;
                    var es = new EventSource(backupAgentUrl('/node-backup/progress'));
                    activeSSE = es;
                    es.onmessage = function(e) {
                        if (progressStreamClosed) return;
                        try {
                            var d = JSON.parse(e.data);
                            if (d.total > 0) {
                                var pct = Math.round((d.completed / d.total) * 100);
                                bar.style.width = pct + '%';
                                text.textContent = pct + '% (' + d.completed + '/' + d.total + ')';
                            }
                            if (d.current_server) status.textContent = 'Backing up: ' + d.current_server;
                            if (d.status === 'completed' || d.status === 'failed' || d.status === 'partial' || d.phase === 'complete') {
                                if (activeSSE === es) activeSSE = null;
                                es.onmessage = null;
                                es.onerror = null;
                                es.close();
                                bar.classList.remove('progress-bar-success', 'progress-bar-danger', 'progress-bar-warning');
                                var isDone = d.status === 'completed' || d.phase === 'complete';
                                var isPartial = d.status === 'partial';
                                bar.classList.add(isDone ? 'progress-bar-success' : (isPartial ? 'progress-bar-warning' : 'progress-bar-danger'));
                                var statusLabel = d.phase === 'complete' ? 'completed' : d.status;
                                var failInfo = isPartial && d.failed ? ' (' + d.failed + '/' + (d.total || 0) + ' failed)' : '';
                                status.textContent = 'Backup ' + statusLabel + failInfo;
                                loadHistory();
                                loadStats();
                            }
                        } catch(err) {}
                    };
                    es.onerror = function() {
                        if (progressStreamClosed) return;
                        es.close();
                        if (activeSSE === es) activeSSE = null;
                        fetchBackupStatus()
                            .then(function(data) {
                                if (progressStreamClosed) return;
                                if (data && data.running) {
                                    status.textContent = 'Reconnecting to backup stream...';
                                    scheduleProgressReconnect(1200);
                                    return;
                                }

                                if (data && data.latest_run && data.latest_run.recent && renderTerminalBackupState(data.latest_run)) {
                                    loadHistory();
                                    loadStats();
                                    return;
                                }

                                var msg = (data && data.last_error)
                                    ? ('Backup aborted: ' + data.last_error)
                                    : 'Backup stream disconnected. No active backup run.';
                                status.textContent = msg;
                                bar.classList.remove('progress-bar-success', 'progress-bar-warning');
                                bar.classList.add('progress-bar-danger');
                                text.textContent = 'Failed';
                                loadHistory();
                                loadStats();
                            })
                            .catch(function() {
                                if (progressStreamClosed) return;
                                status.textContent = 'Connection lost';
                            });
                    };
                })
                .catch(function() {
                    if (progressStreamClosed) return;
                    status.textContent = 'Unable to obtain direct agent ticket. Retrying...';
                    scheduleProgressReconnect(2500);
                });
        }

        function stopAllBackupConnections() {
            stopRestorePoll();
            stopProgressSSE();
        }
        window.addEventListener('beforeunload', stopAllBackupConnections);
        window.addEventListener('pagehide', stopAllBackupConnections);

        // ─── Backup Stats ────────────────────────────────────────────
        function fmtDate(iso) {
            if (!iso) return '—';
            var d = new Date(iso.replace(' ', 'T'));
            if (isNaN(d)) return iso;
            return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
        }
        function fmtSize(bytes) {
            if (!bytes) return '0 B';
            if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
            if (bytes >= 1048576)    return (bytes / 1048576).toFixed(1) + ' MB';
            if (bytes >= 1024)       return (bytes / 1024).toFixed(0) + ' KB';
            return bytes + ' B';
        }

        var nextAutoTs = null;
        function updateCountdown() {
            var el = document.getElementById('statCountdown');
            if (!nextAutoTs || !el) return;
            var diff = Math.floor((nextAutoTs - Date.now()) / 1000);
            if (diff <= 0) { el.textContent = 'Starting now…'; return; }
            var months = Math.floor(diff / (86400 * 30));
            var weeks  = Math.floor(diff / (86400 * 7));
            var days   = Math.floor(diff / 86400);
            var hours  = Math.floor(diff / 3600);
            var mins   = Math.floor(diff / 60);
            var text;
            if (months >= 1)     text = 'In ' + months + (months === 1 ? ' Month'  : ' Months');
            else if (weeks >= 1) text = 'In ' + weeks  + (weeks  === 1 ? ' Week'   : ' Weeks');
            else if (days >= 1)  text = 'In ' + days   + (days   === 1 ? ' Day'    : ' Days');
            else if (hours >= 1) text = 'In ' + hours  + (hours  === 1 ? ' Hour'   : ' Hours');
            else if (mins >= 1)  text = 'In ' + mins   + (mins   === 1 ? ' Minute' : ' Minutes');
            else                 text = 'In ' + diff   + ' Sec';
            el.textContent = text;
        }

        function loadStats() {
            fetch('/admin/nodes/view/' + nodeId + '/backups/stats', { credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(s) {
                    document.getElementById('statLastAuto').textContent   = fmtDate(s.last_auto);
                    document.getElementById('statLastManual').textContent = fmtDate(s.last_manual);
                    document.getElementById('statTotalCount').textContent = s.total_count || '0';
                    document.getElementById('statTotalSize').textContent  = fmtSize(s.total_size_bytes);
                    if (s.next_run_in_seconds && s.next_run_in_seconds > 0) {
                        // Use authoritative time-to-go from agent
                        nextAutoTs = Date.now() + s.next_run_in_seconds * 1000;
                        if (s.next_auto) document.getElementById('statNextAuto').textContent = fmtDate(s.next_auto);
                        updateCountdown();
                    } else if (s.next_auto) {
                        document.getElementById('statNextAuto').textContent = fmtDate(s.next_auto);
                        nextAutoTs = new Date(s.next_auto.replace(' ', 'T')).getTime();
                        updateCountdown();
                    } else {
                        document.getElementById('statNextAuto').textContent = '—';
                    }
                }).catch(function() {});
        }
        loadStats();
        setInterval(updateCountdown, 1000); // refresh countdown every second for precise display

        // ─── Auto-show progress if backup running on page load ───────
        (function checkRunningBackup() {
            fetchBackupStatus()
                .then(function(data) {
                    if (data.running) {
                        var bar = document.getElementById('backupProgressBar');
                        var text = document.getElementById('backupProgressText');
                        var status = document.getElementById('backupStatusText');
                        document.getElementById('progressBox').style.display = '';
                        if (data.total > 0) {
                            var pct = Math.round((data.completed / data.total) * 100);
                            bar.style.width = pct + '%';
                            text.textContent = pct + '% (' + data.completed + '/' + data.total + ')';
                        }
                        if (data.current_server) status.textContent = 'Backing up: ' + data.current_server;
                        startProgressSSE();
                    } else if (data.last_error) {
                        var status = document.getElementById('backupStatusText');
                        var bar = document.getElementById('backupProgressBar');
                        var text = document.getElementById('backupProgressText');
                        document.getElementById('progressBox').style.display = '';
                        status.textContent = 'Last backup error: ' + data.last_error;
                        bar.classList.remove('progress-bar-success', 'progress-bar-warning');
                        bar.classList.add('progress-bar-danger');
                        bar.style.width = '100%';
                        text.textContent = 'Failed';
                    }
                }).catch(function() {});
        })();
    })();
    </script>
@endif
@endsection
