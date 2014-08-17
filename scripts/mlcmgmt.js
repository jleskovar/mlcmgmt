/**
 * MLC KPI Graph and Management Tool 0.0.1
 */


(function () {
    "use strict";

////////////////////////////////////////////////////////////////////////////////////////////////
// Controllers
////////////////////////////////////////////////////////////////////////////////////////////////
    function mlcServerController($scope, mlcMgmtService) {
        $scope.servers = mlcMgmtService.servers;
        $scope.addServer = function () {
            mlcMgmtService.addServer($scope.mlcServer);
            $scope.mlcServer = '';
        };
        $scope.refresh = function () {
            mlcMgmtService.refreshAllNodes();
        };
        $scope.removeServer = function (server) {
            mlcMgmtService.removeServer(server);
        };
    }

    function mlcCorbaController($scope, $routeParams, Restangular) {
    }

    function mlcLicenseController($scope, $routeParams, Restangular) {
        var svr = $routeParams.server;
        $scope.server = svr;
        $scope.loaded = false;
        Restangular.one('/api/licence/' + svr).get().then(function (license) {
            $scope.license = license;
            $scope.originalLicense = angular.copy(license);
            $scope.loaded = true
        });

        $scope.reset = function () {
            $scope.license = angular.copy($scope.originalLicense);
        };

        $scope.submit = function () {
            $scope.loaded = false;
            $scope.license.post().then(function (license) {
                $scope.license = license;
                $scope.originalLicense = angular.copy(license);
                $scope.loaded = true
            })
        };

        $scope.reset = function () {
            $scope.featureFilter = '';
            $scope.license = $scope.originalLicense;
        }
    }

    function mlcKpiController($scope, Restangular) {
    }

////////////////////////////////////////////////////////////////////////////////////////////////
// Services
////////////////////////////////////////////////////////////////////////////////////////////////
    function mlcMgmtService(Restangular, localStorageService) {
        this.servers = localStorageService.get('savedMlcServers') || [];

        this.refreshNodes = function (mlcServer) {

            mlcServer.nodes = [];
            mlcServer.alarms = {};

            var puList = Restangular.all('/api/pu/' + mlcServer.server).getList();
            puList.then(function (nodes) {
                _.forEach(nodes, function (node) {
                    Restangular.oneUrl('pu', node._href).get().then(function (node) {
                        mlcServer.nodes.push(node);
                    })
                })
            });

            Restangular.one('/api/alarms/' + mlcServer.server).get().then(function (summary) {
                mlcServer.alarms = summary;
            })
        };

        this.addServer = function (serverToAdd) {
            var mlcServer = {};
            mlcServer.server = serverToAdd;
            mlcServer.nodes = [];

            this.servers.push(mlcServer);
            localStorageService.set('savedMlcServers', this.servers);

            this.refreshNodes(mlcServer);
        };

        this.removeServer = function (serverToRemove) {
            _.remove(this.servers, function (svr) {
                return svr.server === serverToRemove;
            });
            localStorageService.set('savedMlcServers', this.servers);
        };

        this.refreshAllNodes = function () {
            _.forEach(this.servers, this.refreshNodes, this);
        };

        this.refreshAllNodes();
    }


////////////////////////////////////////////////////////////////////////////////////////////////
// Modules
////////////////////////////////////////////////////////////////////////////////////////////////
    angular.module('mlcMgmtApplication',
        [ 'restangular', 'ui.router', 'ui.bootstrap', 'LocalStorageModule', 'configuration' ])
        .service('mlcMgmtService', mlcMgmtService)
        .controller('mlcServerController', mlcServerController)
        .controller('mlcLicenseController', mlcLicenseController)
        .controller('mlcKpiController', mlcKpiController)
        .controller('mlcCorbaController', mlcCorbaController)
        .filter('mlcVersion', function () {
            return function (input) {
                input = input || '';
                input = input.replace('vMLC', '');
                input = input.replace(/_/g, '.');
                return input;
            };
        })
        .config(function (RestangularProvider, config, $routeProvider) {
            RestangularProvider.setBaseUrl(config.baseUrl);
            RestangularProvider.setRestangularFields({
                id: "_id",
                selfLink: "_href"
            });

            // Configure routes
            $routeProvider
                .when('/add', {
                    templateUrl: 'partials/server-add.html',
                    controller: 'mlcServerController'
                })
                .when('/corba/:server', {
                    templateUrl: 'partials/server-corba.html',
                    controller: 'mlcCorbaController'
                })
                .when('/kpi/:server', {
                    templateUrl: 'partials/server-kpi.html',
                    controller: 'mlcKpiController'
                })
                .when('/license/:server', {
                    templateUrl: 'partials/server-licenses.html',
                    controller: 'mlcLicenseController'
                })
                .otherwise({
                    redirectTo: '/add'
                });
        });

}());
