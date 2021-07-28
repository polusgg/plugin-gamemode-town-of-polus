import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Impostor } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { ResourceResponse } from "@polusgg/plugin-polusgg-api/src/types";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";

export class MarkerManager extends BaseManager {
  getId(): string { return "marker" }
  getTypeName(): string { return "Marker" }
}

export class Marker extends Impostor {
  protected metadata: RoleMetadata = {
    name: "Marker",
    alignment: RoleAlignment.Impostor,
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    const connections = owner.getLobby().getConnections();
    const promises: Promise<ResourceResponse>[] = [];

    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i];

      promises.push(Services.get(ServiceType.Resource).load(connection, AssetBundle.loadSafeFromCache("TownOfPolus")));
    }

    Promise.all(promises).then(this.onReady.bind(this));
  }

  onReady(): void {
    Services.get(ServiceType.Hud).chatVisibility(this.owner.getConnection()!, true);

    this.catch("player.chat.message", event => event.getPlayer()).execute(event => {
      if (event.getMessage().toString().startsWith("/mark")) {
        const playerId = parseInt(event.getMessage().toString().split("/mark")[1].trim(), 10);

        const player = this.owner.getLobby().findPlayerByPlayerId(playerId);

        if (player === undefined) {
          return;
        }

        this.mark(player);
      }
    });
  }

  getManagerType(): typeof BaseManager {
    return MarkerManager;
  }

  async mark(player: PlayerInstance): Promise<void> {
    await Services.get(ServiceType.PointOfInterestManager).spawnPointOfInterest(this.owner.getSafeConnection(), AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/ImpostorArrow.png"), player.getPosition(), player);
    await Services.get(ServiceType.PointOfInterestManager).spawnPointOfInterest(player.getSafeConnection(), AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/ImpostorArrow.png"), this.owner.getPosition(), this.owner);
  }

  getAssignmentScreen(_player: PlayerInstance, _impostorCount: number): StartGameScreenData {
    return {
      title: "Marker",
      subtitle: `Mark a player and reveal their location`,
      color: [133, 255, 122, 255],
    };
  }

  getDescriptionText(): string {
    return `<color=#85ff7a>Role: Marker
Mark a player and reveal their location.</color>`;
  }
}
