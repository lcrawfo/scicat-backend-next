"use strict";

// process.env.NODE_ENV = 'test';

const chai = require("chai");
const chaiHttp = require("chai-http");
const request = require("supertest");
const should = chai.should();
const utils = require("./LoginUtils");
const nock = require("nock");
const sandbox = require("sinon").createSandbox();

chai.use(chaiHttp);

var accessTokenArchiveManager = null;
var idOrigDatablock = null;
let accessToken = null,
  defaultPid = null,
  pid = null,
  pidnonpublic = null,
  attachmentId = null,
  doi = null;

const testPublishedData = {
  creator: ["ESS"],
  publisher: "ESS",
  publicationYear: 2020,
  title: "dd",
  url: "",
  abstract: "dd",
  dataDescription: "dd",
  resourceType: "raw",
  numberOfFiles: null,
  sizeOfArchive: null,
  pidArray: ["20.500.11935/243adb8a-30b7-4c3a-af2b-a1f2ac46353b"],
};

const modifiedPublishedData = {
  publisher: "PSI",
  abstract: "a new abstract",
};

const testdataset = {
  owner: "Bertram Astor",
  ownerEmail: "bertram.astor@grumble.com",
  orcidOfOwner: "unknown",
  contactEmail: "bertram.astor@grumble.com",
  sourceFolder: "/iramjet/tif/",
  creationTime: "2011-09-14T06:08:25.000Z",
  keywords: ["Cryo", "Calibration"],
  description: "None",
  type: "raw",
  license: "CC BY-SA 4.0",
  isPublished: true,
  ownerGroup: "p13388",
  accessGroups: [],
};

const nonpublictestdataset = {
  owner: "Bertram Astor",
  ownerEmail: "bertram.astor@grumble.com",
  orcidOfOwner: "unknown",
  contactEmail: "bertram.astor@grumble.com",
  sourceFolder: "/iramjet/tif/",
  creationTime: "2011-09-14T06:08:25.000Z",
  keywords: ["Cryo", "Calibration"],
  description: "None",
  type: "raw",
  license: "CC BY-SA 4.0",
  isPublished: false,
  ownerGroup: "examplenonpublicgroup",
  accessGroups: [],
};

var testorigDataBlock = {
  size: 41780189,
  dataFileList: [
    {
      path: "N1039__B410489.tif",
      size: 8356037,
      time: "2017-07-24T13:56:30.000Z",
      uid: "egon.meiera@psi.ch",
      gid: "p16738",
      perm: "-rw-rw-r--",
    },
    {
      path: "N1039__B410613.tif",
      size: 8356038,
      time: "2017-07-24T13:56:35.000Z",
      uid: "egon.meiera@psi.ch",
      gid: "p16738",
      perm: "-rw-rw-r--",
    },
    {
      path: "N1039__B410729.tif",
      size: 8356038,
      time: "2017-07-24T13:56:41.000Z",
      uid: "egon.meiera@psi.ch",
      gid: "p16738",
      perm: "-rw-rw-r--",
    },
    {
      path: "N1039__B410200.tif",
      size: 8356038,
      time: "2017-07-24T13:56:18.000Z",
      uid: "egon.meiera@psi.ch",
      gid: "p16738",
      perm: "-rw-rw-r--",
    },
    {
      path: "N1039__B410377.tif",
      size: 8356038,
      time: "2017-07-24T13:56:25.000Z",
      uid: "egon.meiera@psi.ch",
      gid: "p16738",
      perm: "-rw-rw-r--",
    },
  ],
};

const app = "http://localhost:3000";

describe("Test of access to published data", () => {
  beforeEach((done) => {
    utils.getToken(
      app,
      {
        username: "ingestor",
        password: "aman",
      },
      (tokenVal) => {
        accessToken = tokenVal;
        utils.getToken(
          app,
          {
            username: "archiveManager",
            password: "aman",
          },
          (tokenVal) => {
            accessTokenArchiveManager = tokenVal;
            done();
          },
        );
      },
    );
  });

  afterEach((done) => {
    sandbox.restore();
    done();
  });

  it("adds a published data", async () => {
    return request(app)
      .post("/api/v3/PublishedData")
      .send(testPublishedData)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("publisher").and.be.string;
        doi = encodeURIComponent(res.body["doi"]);
      });
  });

  it("should fetch this new published data", async () => {
    return request(app)
      .get("/api/v3/PublishedData/" + doi)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("publisher").and.equal("ESS");
        res.body.should.have
          .property("status")
          .and.equal("pending_registration");
      });
  });

  it("should register this new published data", async () => {
    nock("http://127.0.0.1:3000")
      .post("/api/v3/PublishedData/" + doi + "/register")
      .set({ Authorization: `Bearer ${accessToken}` })
      .reply(200);
  });

  it("should register this new published data", async () => {
    const config = require("../server/config.local");
    sandbox.stub(config, "site").value("PSI");
    if (config.oaiProviderRoute)
      sandbox.stub(config, "oaiProviderRoute").value(null);
    return request(app)
      .post("/api/v3/PublishedData/" + doi + "/register/")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200)
      .expect("Content-Type", /json/);
  });

  it("should fetch this new published data", async () => {
    return request(app)
      .get("/api/v3/PublishedData/" + doi)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("status").and.equal("registered");
      });
  });

  it("should resync this new published data", async () => {
    nock("http://127.0.0.1:3000")
      .post("/api/v3/PublishedData/" + doi + "/resync", {
        data: modifiedPublishedData,
      })
      .set({ Authorization: `Bearer ${accessToken}` })
      .reply(200);
  });

  it("should fetch this new published data", async () => {
    return request(app)
      .get("/api/v3/PublishedData/" + doi)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200)
      .expect("Content-Type", /json/);
  });

  it("adds a new dataset", async () => {
    return request(app)
      .post("/api/v3/Datasets")
      .send(testdataset)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("version").and.be.string;
        res.body.should.have.property("type").and.equal("raw");
        res.body.should.have.property("pid").and.be.string;
        res.body.should.have.property("datasetName").and.be.string;
        //res.body.should.not.have.property('history')
        defaultPid = res.body["pid"];
        pid = encodeURIComponent(res.body["pid"]);
        testorigDataBlock.datasetId = res.body["pid"];
      });
  });

  it("adds a new nonpublic dataset", async () => {
    return request(app)
      .post("/api/v3/Datasets")
      .send(nonpublictestdataset)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("version").and.be.string;
        res.body.should.have.property("isPublished").and.equal(false);
        res.body.should.have.property("pid").and.be.string;
        res.body.should.have.property("datasetName").and.be.string;
        //res.body.should.not.have.property('history')
        pidnonpublic = encodeURIComponent(res.body["pid"]);
      });
  });

  it("should create one publisheddata to dataset relation", async () => {
    return request(app)
      .put("/api/v3/PublishedData/" + doi + "/datasets/rel/" + pid)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("datasetId")
          .and.equal(decodeURIComponent(pid));
        res.body.should.have
          .property("publishedDataId")
          .and.equal(decodeURIComponent(doi));
      });
  });

  it("should fetch publisheddata with non empty dataset relation", async () => {
    return request(app)
      .get("/api/v3/PublishedData/" + doi + "?filter=%7B%22include%22%3A%7B%22relation%22%3A%22datasets%22%7D%7D")
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("datasets").and.not.equal([]);
        res.body.datasets[0].should.have
          .property("pid")
          .and.equal(decodeURIComponent(pid));
      });
  });

  it("should delete this published data", async () => {
    return request(app)
      .delete("/api/v3/PublishedData/" + doi)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(200)
      .expect("Content-Type", /json/);
  });

  it("should fetch this new dataset", async () => {
    return request(app)
      .get("/api/v3/Datasets/" + pid)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("isPublished").and.equal(true);
      });
  });

  it("should fetch the non public dataset as ingestor", async () => {
    return request(app)
      .get("/api/v3/Datasets/" + pidnonpublic)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("isPublished").and.equal(false);
      });
  });

  it("adds a new origDatablock", async () => {
    return request(app)
      .post("/api/v3/OrigDatablocks")
      .send(testorigDataBlock)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("size").and.equal(41780189);
        res.body.should.have.property("id").and.be.string;
        idOrigDatablock = encodeURIComponent(res.body["id"]);
      });
  });

  it("should add a new attachment to this dataset", async () => {
    const testAttachment = {
      thumbnail: "data/abc123",
      caption: "Some caption",
      datasetId: defaultPid,
      ownerGroup: "ess",
      accessGroups: ["loki", "odin"],
      createdBy: "Bertram Astor",
      updatedBy: "anonymous",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return request(app)
      .post("/api/v3/Datasets/" + pid + "/attachments")
      .send(testAttachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("thumbnail")
          .and.equal(testAttachment.thumbnail);
        res.body.should.have
          .property("caption")
          .and.equal(testAttachment.caption);
        res.body.should.have
          .property("ownerGroup")
          .and.equal(testAttachment.ownerGroup);
        res.body.should.have.property("accessGroups");
        res.body.should.have.property("createdBy");
        res.body.should.have.property("updatedBy").and.be.string;
        res.body.should.have.property("createdAt");
        res.body.should.have.property("id").and.be.string;
        res.body.should.have
          .property("datasetId")
          .and.equal(testAttachment.datasetId);
        attachmentId = encodeURIComponent(res.body["id"]);
      });
  });

  it("should fetch this dataset attachment", async () => {
    return request(app)
      .get("/api/v3/Datasets/" + pid + "/attachments/" + attachmentId)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200)
      .expect("Content-Type", /json/);
  });

  it("should fetch some published datasets anonymously", async () => {
    var fields = {
      ownerGroup: ["p13388"],
    };
    var limits = {
      skip: 0,
      limit: 2,
    };
    return request(app)
      .get("/api/v3/Datasets/fullquery" + "?fields=" + encodeURIComponent(JSON.stringify(fields)) + "&limits=" + encodeURIComponent(JSON.stringify(limits)))
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body[0].should.have.property("isPublished").and.equal(true);
      });
  });

  it("should fail to fetch non-public dataset anonymously", async () => {
    var fields = {
      ownerGroup: ["examplenonpublicgroup"],
    };
    var limits = {
      skip: 0,
      limit: 2,
    };
    return request(app)
      .get("/api/v3/Datasets/fullquery" + "?fields=" + encodeURIComponent(JSON.stringify(fields)) + "&limits=" + encodeURIComponent(JSON.stringify(limits)))
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(0);
      });
  });

  it("should fetch one dataset including related data anonymously", async () => {
    var limits = {
      skip: 0,
      limit: 2,
    };
    var filter = {
      where: {
        ownerGroup: "p13388",
      },
      include: [
        {
          relation: "origdatablocks",
        },
        {
          relation: "datablocks",
        },
        {
          relation: "attachments",
        },
      ],
    };

    return request(app)
      .get("/api/v3/Datasets/findOne" + "?filter=" + encodeURIComponent(JSON.stringify(filter)) + "&limits=" + encodeURIComponent(JSON.stringify(limits)))
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.origdatablocks[0].should.have
          .property("ownerGroup")
          .and.equal("p13388");
      });
  });

  it("should delete this dataset attachment", async () => {
    return request(app)
      .delete("/api/v3/Datasets/" + pid + "/attachments/" + attachmentId)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(204);
  });

  it("should delete a OrigDatablock", async () => {
    return request(app)
      .delete("/api/v3/OrigDatablocks/" + idOrigDatablock)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("count").and.equal(1);
      });
  });

  it("should delete the nonpublic dataset", async () => {
    return request(app)
      .delete("/api/v3/Datasets/" + pidnonpublic)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(200)
      .expect("Content-Type", /json/);
  });

  it("should delete this dataset", async () => {
    return request(app)
      .delete("/api/v3/Datasets/" + pid)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(200)
      .expect("Content-Type", /json/);
  });
});
