@extends('layouts.admin')

@section('title')
    Server — {{ $server->name }}: Build Details
@endsection

@section('content-header')
    <h1>{{ $server->name }}<small>Control allocations and system resources for this server.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.servers') }}">Servers</a></li>
        <li><a href="{{ route('admin.servers.view', $server->id) }}">{{ $server->name }}</a></li>
        <li class="active">Build Configuration</li>
    </ol>
@endsection

@section('content')
@include('admin.servers.partials.navigation')
<div class="row">



    @if($server->subSplit)
        <div class="col-xs-12">
            <div class="alert alert-warning">
                <h4><i class="icon fa fa-lock"></i> Resource Editing Locked</h4>
                <p>This server is a <strong>Sub-server</strong>. Its resources are managed by the Server Splitter on the Master Server and cannot be edited here directly.</p>
                <br>
                <button type="button" class="btn btn-warning btn-xs" id="forceEditBtn">Enable Force Edit</button>
            </div>
        </div>
        <script>
            document.getElementById('forceEditBtn').addEventListener('click', function() {
                var inputs = document.querySelectorAll('input[disabled], select[disabled]');
                inputs.forEach(function(input) {
                    input.removeAttribute('disabled');
                });
                this.textContent = 'Editing Enabled';
                this.classList.remove('btn-warning');
                this.classList.add('btn-success');
                this.disabled = true;
            });
        </script>
    @endif
    @php
        $isMaster = $server->splits->isNotEmpty();
        $totalMemory = $isMaster ? $server->memory + $server->splits->sum('allocated_memory') : $server->memory;
        $totalCpu = $isMaster ? $server->cpu + $server->splits->sum('allocated_cpu') : $server->cpu;
        $totalDisk = $isMaster ? $server->disk + $server->splits->sum('allocated_disk') : $server->disk;
        $totalSwap = $isMaster ? $server->swap + $server->splits->sum('allocated_swap') : $server->swap;
        // IO is not split
        $totalAllocations = $isMaster ? $server->allocation_limit + $server->splits->sum('allocated_network_allocations') : $server->allocation_limit;
        $totalDatabases = $isMaster ? $server->database_limit + $server->splits->sum('allocated_database_limit') : $server->database_limit;
        $totalBackups = $isMaster ? $server->backup_limit + $server->splits->sum('allocated_backup_limit') : $server->backup_limit;
    @endphp
    <form action="{{ route('admin.servers.view.build', $server->id) }}" method="POST">
        <div class="col-sm-5">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">Resource Management</h3>
                </div>
                <div class="box-body">
                <div class="form-group">
                        <label for="cpu" class="control-label">CPU Limit</label>
                        <div class="input-group">
                            <input type="text" name="cpu" class="form-control" value="{{ old('cpu', $totalCpu) }}" {{ $server->subSplit ? 'disabled' : '' }}/>
                            <span class="input-group-addon">%</span>
                        </div>
                        <p class="text-muted small">Each <em>virtual</em> core (thread) on the system is considered to be <code>100%</code>. Setting this value to <code>0</code> will allow a server to use CPU time without restrictions.</p>
                    </div>
                    <div class="form-group">
                        <label for="threads" class="control-label">CPU Pinning</label>
                        <div>
                            <input type="text" name="threads" class="form-control" value="{{ old('threads', $server->threads) }}" {{ $server->subSplit ? 'disabled' : '' }}/>
                        </div>
                        <p class="text-muted small"><strong>Advanced:</strong> Enter the specific CPU cores that this process can run on, or leave blank to allow all cores. This can be a single number, or a comma seperated list. Example: <code>0</code>, <code>0-1,3</code>, or <code>0,1,3,4</code>.</p>
                    </div>
                    <div class="form-group">
                        <label for="memory" class="control-label">Allocated Memory</label>
                        <div class="input-group">
                            <input type="text" name="memory" data-multiplicator="true" class="form-control" value="{{ old('memory', $totalMemory) }}" {{ $server->subSplit ? 'disabled' : '' }}/>
                            <span class="input-group-addon">MiB</span>
                        </div>
                        <p class="text-muted small">The maximum amount of memory allowed for this container. Setting this to <code>0</code> will allow unlimited memory in a container.</p>
                    </div>
                    <div class="form-group">
                        <label for="swap" class="control-label">Allocated Swap</label>
                        <div class="input-group">
                            <input type="text" name="swap" data-multiplicator="true" class="form-control" value="{{ old('swap', $totalSwap) }}" {{ $server->subSplit ? 'disabled' : '' }}/>
                            <span class="input-group-addon">MiB</span>
                        </div>
                        <p class="text-muted small">Setting this to <code>0</code> will disable swap space on this server. Setting to <code>-1</code> will allow unlimited swap.</p>
                    </div>
                    <div class="form-group">
                        <label for="cpu" class="control-label">Disk Space Limit</label>
                        <div class="input-group">
                            <input type="text" name="disk" class="form-control" value="{{ old('disk', $totalDisk) }}" {{ $server->subSplit ? 'disabled' : '' }}/>
                            <span class="input-group-addon">MiB</span>
                        </div>
                        <p class="text-muted small">This server will not be allowed to boot if it is using more than this amount of space. If a server goes over this limit while running it will be safely stopped and locked until enough space is available. Set to <code>0</code> to allow unlimited disk usage.</p>
                    </div>
                    <div class="form-group">
                        <label for="io" class="control-label">Block IO Proportion</label>
                        <div>
                            <input type="text" name="io" class="form-control" value="{{ old('io', $server->io) }}" {{ $server->subSplit ? 'disabled' : '' }}/>
                        </div>
                        <p class="text-muted small"><strong>Advanced</strong>: The IO performance of this server relative to other <em>running</em> containers on the system. Value should be between <code>10</code> and <code>1000</code>.</code></p>
                    </div>
                    <div class="form-group">
                        <label for="cpu" class="control-label">OOM Killer</label>
                        <div>
                            <div class="radio radio-danger radio-inline">
                                <input type="radio" id="pOomKillerEnabled" value="0" name="oom_disabled" @if(!$server->oom_disabled)checked @endif {{ $server->subSplit ? 'disabled' : '' }}>
                                <label for="pOomKillerEnabled">Enabled</label>
                            </div>
                            <div class="radio radio-success radio-inline">
                                <input type="radio" id="pOomKillerDisabled" value="1" name="oom_disabled" @if($server->oom_disabled)checked @endif {{ $server->subSplit ? 'disabled' : '' }}>
                                <label for="pOomKillerDisabled">Disabled</label>
                            </div>
                            <p class="text-muted small">
                                Enabling OOM killer may cause server processes to exit unexpectedly.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-sm-7">
            <div class="row">
                <div class="col-xs-12">
                    <div class="box">
                        <div class="box-header with-border">
                            <h3 class="box-title">Application Feature Limits</h3>
                        </div>
                        <div class="box-body">
                            <div class="row">
                                <div class="form-group col-xs-6">
                                    <label for="database_limit" class="control-label">Database Limit</label>
                                    <div>
                                        <input type="text" name="database_limit" class="form-control" value="{{ old('database_limit', $totalDatabases) }}" {{ $server->subSplit ? 'disabled' : '' }}/>
                                    </div>
                                    <p class="text-muted small">The total number of databases a user is allowed to create for this server.</p>
                                </div>
                                <div class="form-group col-xs-6">
                                    <label for="allocation_limit" class="control-label">Allocation Limit</label>
                                    <div>
                                        <input type="text" name="allocation_limit" class="form-control" value="{{ old('allocation_limit', $totalAllocations) }}" {{ $server->subSplit ? 'disabled' : '' }}/>
                                    </div>
                                    <p class="text-muted small">The total number of allocations a user is allowed to create for this server.</p>
                                </div>
                                <div class="form-group col-xs-6">
                                    <label for="backup_limit" class="control-label">Backup Limit</label>
                                    <div>
                                        <input type="text" name="backup_limit" class="form-control" value="{{ old('backup_limit', $totalBackups) }}" {{ $server->subSplit ? 'disabled' : '' }}/>
                                    </div>
                                    <p class="text-muted small">The total number of backups that can be created for this server.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                @if($addonSplitterEnabled || $addonProxyEnabled || $addonSubdomainEnabled || $addonServerTypeChangerEnabled)
                <div class="col-xs-12">
                    <div class="box box-primary">
                        <div class="box-header with-border">
                            <h3 class="box-title">Addon Feature Limits</h3>
                        </div>
                        <div class="box-body">
                            <div class="row">
                                @if($addonSplitterEnabled)
                                <div class="form-group col-xs-6">
                                    <label for="split_limit" class="control-label">Server Split Limit</label>
                                    <div>
                                        <input type="number" min="0" name="split_limit" class="form-control" value="{{ old('split_limit', $splitterLimit) }}"/>
                                    </div>
                                    <p class="text-muted small">Max number of sub-servers this server can create via the Server Splitter addon. Set to <code>0</code> to remove the override and use addon defaults.</p>
                                </div>
                                @endif
                                @if($addonProxyEnabled)
                                <div class="form-group col-xs-6">
                                    <label for="proxy_limit" class="control-label">Reverse Proxy Limit</label>
                                    <div>
                                        <input type="number" min="0" name="proxy_limit" class="form-control" value="{{ old('proxy_limit', $proxyLimit) }}"/>
                                    </div>
                                    <p class="text-muted small">Max number of reverse proxies this server can create. Set to <code>0</code> to remove the override and use addon defaults.</p>
                                </div>
                                @endif
                                @if($addonSubdomainEnabled)
                                <div class="form-group col-xs-6">
                                    <label for="subdomain_limit" class="control-label">Subdomain Limit</label>
                                    <div>
                                        <input type="number" min="0" name="subdomain_limit" class="form-control" value="{{ old('subdomain_limit', $subdomainLimit) }}"/>
                                    </div>
                                    <p class="text-muted small">Max number of subdomains this server can create via the Subdomain Manager addon. Set to <code>0</code> to remove the override and use addon defaults.</p>
                                </div>
                                @endif
                            </div>

                            <div class="row">
                                @if($addonServerTypeChangerEnabled)
                                <div class="form-group col-xs-6">
                                    <input type="hidden" name="server_type_changer_allowed" value="0" />
                                    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;">
                                        <input type="checkbox"
                                            id="serverTypeChangerAllowed"
                                            name="server_type_changer_allowed"
                                            value="1"
                                            @checked(old('server_type_changer_allowed') !== null ? old('server_type_changer_allowed') === '1' : (bool)($server->server_type_changer_allowed ?? false))
                                            style="width:18px;height:18px;cursor:pointer;accent-color:#3c8dbc;flex-shrink:0;"
                                        />
                                        <label for="serverTypeChangerAllowed" style="margin:0;cursor:pointer;font-weight:600;">
                                            Allow Server Type Changer
                                        </label>
                                    </div>
                                    <p class="text-muted small">Enable this option to allow this server to use the Server Type Changer addon.</p>
                                </div>
                                @endif
                            </div>
                        </div>
                    </div>
                </div>
                @endif

                <div class="col-xs-12">
                    <div class="box">
                        <div class="box-header with-border">
                            <h3 class="box-title">Allocation Management</h3>
                        </div>
                        <div class="box-body">
                            <div class="form-group">
                                <label for="pAllocation" class="control-label">Game Port</label>
                                <select id="pAllocation" name="allocation_id" class="form-control">
                                    @foreach ($assigned as $assignment)
                                        <option value="{{ $assignment->id }}"
                                            @if($assignment->id === $server->allocation_id)
                                                selected="selected"
                                            @endif
                                        >{{ $assignment->alias }}:{{ $assignment->port }}</option>
                                    @endforeach
                                </select>
                                <p class="text-muted small">The default connection address that will be used for this game server.</p>
                            </div>
                            <div class="form-group">
                                <label for="pAddAllocations" class="control-label">Assign Additional Ports</label>
                                <div>
                                    <select name="add_allocations[]" class="form-control" multiple id="pAddAllocations">
                                        @foreach ($unassigned as $assignment)
                                            <option value="{{ $assignment->id }}">{{ $assignment->alias }}:{{ $assignment->port }}</option>
                                        @endforeach
                                    </select>
                                </div>
                                <p class="text-muted small">Please note that due to software limitations you cannot assign identical ports on different IPs to the same server.</p>
                            </div>
                            <div class="form-group">
                                <label for="pRemoveAllocations" class="control-label">Remove Additional Ports</label>
                                <div>
                                    <select name="remove_allocations[]" class="form-control" multiple id="pRemoveAllocations">
                                        @foreach ($assigned as $assignment)
                                            <option value="{{ $assignment->id }}">{{ $assignment->alias }}:{{ $assignment->port }}</option>
                                        @endforeach
                                    </select>
                                </div>
                                <p class="text-muted small">Simply select which ports you would like to remove from the list above. If you want to assign a port on a different IP that is already in use you can select it from the left and delete it here.</p>
                            </div>
                        </div>
                        <div class="box-footer">
                            {!! csrf_field() !!}
                            <button type="submit" class="btn btn-primary pull-right">Update Build Configuration</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </form>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script>
    $('#pAddAllocations').select2();
    $('#pRemoveAllocations').select2();
    $('#pAllocation').select2();
    </script>
@endsection
